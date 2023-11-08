#include "ahi-retrieve/ahi-connection.h"
#include "ahi-retrieve/string-format.h"
#include "ahi-retrieve/logger.h"
#include "ahi-retrieve/image-frame-download-callback.h"
#include "ahi-retrieve/image-frame-request.h"
#include "ahi-retrieve/ahi-request.h"
#include "ahi-retrieve/curl-aws-sigv4.h"
#include "ahi-retrieve/curl-http-headers.h"
#include "ahi-retrieve/curl-verbose.h"
#include "ahi-retrieve/trace.h"
#include <curl/curl.h>
#include <queue>

static void check(CURLcode code)
{
    if (code != CURLE_OK)
    {
        throw code;
    }
}

static void check(CURLMcode code)
{
    if (code != CURLM_OK)
    {
        throw code;
    }
}

namespace AHIRetrieve
{

    /**
     * @brief Internal request specific state
     *
     */
    struct ImageFrameRequestState
    {
        ImageFrameRequest imageFrameRequest;
        AHIRequest ahiRequest;
    };

    /**
     * @brief Internal state
     *
     */
    struct AHIConnectionImpl
    {
        CURLM *multi_handle;
        std::map<size_t, std::shared_ptr<ImageFrameRequestState>> requestState;
        size_t nextRequestId{0};
        size_t bytesDownloaded{0};
        CURLAwsSigV4 awsSigV4;
        CURHTTPHeaders httpHeaders;
        CURLVerbose verbose;
    };

    AHIConnection::AHIConnection(AHIConnectionArgs &args, AHIConnectionOptions options) : args(args),
                                                                                          options(options)
    {
        Trace trace(options.logger, "AHIConnection::AHIConnection()");
        options.logger.log(INFO, "options.timeoutInMS=%d\n", options.timeoutInMS);
        options.logger.log(INFO, "options.maxConcurrentRequestsPerConnection=%d\n", options.maxConcurrentRequestsPerConnection);

        impl = std::unique_ptr<AHIConnectionImpl>(new AHIConnectionImpl());
        impl->verbose.enableVerbose = options.curlVerboseEnabled ? 1L : 0L;
        impl->multi_handle = curl_multi_init();
        check(curl_multi_setopt(impl->multi_handle, CURLMOPT_MAX_CONCURRENT_STREAMS, options.maxConcurrentRequestsPerConnection));
        check(curl_multi_setopt(impl->multi_handle, CURLMOPT_PIPELINING, CURLPIPE_MULTIPLEX));
        check(curl_multi_setopt(impl->multi_handle, CURLMOPT_MAX_HOST_CONNECTIONS, 1));
        check(curl_multi_setopt(impl->multi_handle, CURLMOPT_MAXCONNECTS, 1));
        check(curl_multi_setopt(impl->multi_handle, CURLMOPT_MAX_TOTAL_CONNECTIONS, 1));

        impl->awsSigV4.awsAccessSecretKey = args.ahiRegion->awsAccessSecretKey;
        impl->awsSigV4.awsSigV4 = stringFormat("aws:amz:%s:medical-imaging", args.ahiRegion->region.c_str());
        if (args.ahiRegion->awsSessionToken.length())
        {
            std::string xAmzSecurityToken = stringFormat("x-amz-security-token: %s", args.ahiRegion->awsSessionToken.c_str());
            impl->httpHeaders.headers.push_back(xAmzSecurityToken);
        }
    }

    AHIConnection::~AHIConnection()
    {
        Trace trace(options.logger, "AHIConnection::~AHIConnection()");

        curl_multi_cleanup(impl->multi_handle);
    }

    int AHIConnection::tick()
    {
        Trace trace(options.logger, "AHIConnection::tick()");

        int still_running = 0; /* keep number of running handles */
        CURLMcode mc = curl_multi_perform(impl->multi_handle, &still_running);

        options.logger.log(LOGLEVEL::DEBUG, "curl_multi_perform() returned %d with still_running = %d\n", mc, still_running);

        if (mc != CURLM_OK)
        {
            options.logger.log(LOGLEVEL::ERROR, "curl_multi_perform() returned %d\n", mc);
        }

        mc = curl_multi_poll(impl->multi_handle, NULL, 0, options.timeoutInMS, NULL);
        options.logger.log(LOGLEVEL::DEBUG, "curl_multi_poll() returned %d with still_running = %d\n", mc);

        if (mc == CURLM_UNRECOVERABLE_POLL)
        {
            options.logger.log(LOGLEVEL::ERROR, "CURLM_UNRECOVERABLE_POLL\n");
            return -1;
        }

        if (mc != CURLM_OK)
        {
            options.logger.log(LOGLEVEL::ERROR, "curl_multi_poll() returned non OK result %d\n", mc);
            return -2;
        }

        size_t numThrottled = handle();

        if (numThrottled)
        {
            options.logger.log(LOGLEVEL::INFO, "GetImageFrame() request throttled\n");
            return -3;
        }

        return impl->requestState.size(); // return the number of requests still pending
    }

    size_t AHIConnection::handle()
    {
        Trace trace(options.logger, "AHIConnection::handle()");

        struct CURLMsg *m;
        size_t numThrottled = 0;
        do
        {
            int msgq = 0;
            m = curl_multi_info_read(impl->multi_handle, &msgq);
            options.logger.log(DEBUG, "curl_multi_info_read - %d messages in queue = %d\n", m, msgq);

            if (m && (m->msg == CURLMSG_DONE))
            {
                CURL *e = m->easy_handle;
                size_t requestId;
                check(curl_easy_getinfo(m->easy_handle, CURLINFO_PRIVATE, (char **)&requestId));

                double downloadTime;
                check(curl_easy_getinfo(e, CURLINFO_TOTAL_TIME, &downloadTime));

                long httpCode = 0;
                check(curl_easy_getinfo(e, CURLINFO_RESPONSE_CODE, &httpCode));

                std::shared_ptr<ImageFrameRequestState> state = impl->requestState[requestId];

                options.logger.log(DEBUG, "request id %d done - http_code=%d, bytes downloaded = %d in %.3f ms\n", requestId, httpCode, state->imageFrameRequest.bytes->size(), downloadTime * 1000.0);

                impl->bytesDownloaded += state->imageFrameRequest.bytes->size();

                state->imageFrameRequest.httpCode = httpCode;
                state->imageFrameRequest.downloadTimeInMicroSeconds = downloadTime;

                if (m->data.result == CURLE_OK)
                {
                    if (httpCode == 200) // Success!
                    {
                        state->imageFrameRequest.status = 0;
                        args.callback.ImageFrameRequestComplete(state->imageFrameRequest);
                    }
                    else if (httpCode == 429) // Too Many Requests - Happens when we exceed the AHI TPS Limit
                    {
                        // if we get throttled, make the request again
                        numThrottled++;
                        addImageFrameRequest(state->imageFrameRequest);
                    }
                    else
                    {
                        state->imageFrameRequest.status = 1;
                        args.callback.ImageFrameRequestComplete(state->imageFrameRequest);
                    }
                }
                else
                {
                    if (m->data.result == 55 || // Failed sending data to peer - AHI probably dropped the connection when overwhelmed?
                        m->data.result == 18)   // Transferred a partial file - AHI probably dropped the connection when overwhelmed?
                    {
                        options.logger.log(LOGLEVEL::WARN, "Unexpected CURLcode %d (%s)\n", m->data.result, curl_easy_strerror(m->data.result));
                    }
                    else
                    {
                        options.logger.log(LOGLEVEL::ERROR, "Unexpected CURLcode %d (%s)\n", m->data.result, curl_easy_strerror(m->data.result));
                    }
                    // We will retry any error forever until it goes through
                    addImageFrameRequest(state->imageFrameRequest);
                }

                curl_multi_remove_handle(impl->multi_handle, e);

                impl->requestState.erase(requestId);
            }
        } while (m);

        if (numThrottled)
        {
            options.logger.log(WARN, "AHI Throttled %d requests\n", numThrottled);
        }

        return numThrottled;
    }

    void AHIConnection::addImageFrameRequest(ImageFrameRequest &request)
    {
        Trace trace(options.logger, "AHIConnection::addImageFrameRequest()");

        std::shared_ptr<ImageFrameRequestState> state = std::make_shared<ImageFrameRequestState>();
        state->imageFrameRequest = request;
        state->imageFrameRequest.bytes->resize(0); // make sure buffer is empty
        state->ahiRequest.post.postData = stringFormat("{\"imageFrameId\": \"%s\"}", request.imageFrameId.c_str());
        state->ahiRequest.url.url = stringFormat("%s/datastore/%s/imageSet/%s/getImageFrame",
                                                 args.ahiRegion->endpoint.c_str(),
                                                 request.datastoreId.c_str(),
                                                 request.imageSetId.c_str());

        size_t requestId = impl->nextRequestId++;
        impl->requestState[requestId] = state;
        setup(requestId);
    }

    void AHIConnection::setup(size_t requestId)
    {
        Trace trace(options.logger, "AHIConnection::setup()");

        options.logger.log(DEBUG, "AHIConnection::setup requestId=%d\n", requestId);

        std::shared_ptr<ImageFrameRequestState> state = impl->requestState[requestId];

        state->imageFrameRequest.bytes->reserve(256 * 1024);
        state->ahiRequest.buffer.buffer = state->imageFrameRequest.bytes;

        std::vector<CURLSetup *> setups;
        setups.push_back(&impl->awsSigV4);
        setups.push_back(&impl->httpHeaders);
        setups.push_back(&impl->verbose);
        state->ahiRequest.addSetups(setups);

        try
        {
            state->ahiRequest.setup();                                            // NOTE - can throw
            state->ahiRequest.handle->setOpt(CURLOPT_PRIVATE, (void *)requestId); // NOTE - can throw
            curl_easy_setopt(state->ahiRequest.handle->get(), CURLOPT_UPLOAD_BUFFERSIZE, 512 * 1024);
            curl_multi_add_handle(impl->multi_handle, state->ahiRequest.handle->get());
        }
        catch (CURLcode &code)
        {
            options.logger.log(LOGLEVEL::ERROR, "libcurl API returned non OK code %s\n", curl_easy_strerror(code));
        }
    }

    size_t AHIConnection::getBytesDownloaded() const
    {
        Trace trace(options.logger, "AHIConnection::getBytesDownloaded()");

        return impl->bytesDownloaded;
    };

    size_t AHIConnection::getRequestCount() const
    {
        return impl->requestState.size();
    }

}
