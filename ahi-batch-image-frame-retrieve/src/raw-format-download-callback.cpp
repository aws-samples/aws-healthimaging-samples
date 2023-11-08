#include "ahi-retrieve/raw-format-download-callback.h"
#include "ahi-retrieve/logger.h"
#include "ahi-retrieve/image-frame-request.h"

using namespace AHIRetrieve;

RawFormatDownloadCallback::RawFormatDownloadCallback() : pDecodeThreadPool(0), bytesDownloaded(0)
{
    pDecodeThreadPool = new DecodeThreadPool(0);
}

RawFormatDownloadCallback::~RawFormatDownloadCallback()
{
    delete pDecodeThreadPool;
}

void RawFormatDownloadCallback::init(size_t numDecodeThreads)
{
    if (!pDecodeThreadPool->getNumThreads())
    {
        log(LOGLEVEL::INFO, "Starting %zu decode threads\n", numDecodeThreads);
        pDecodeThreadPool->addThreads(numDecodeThreads);
    }
    else
    {
        // printf("num decode threads = %zu\n", pDecodeThreadPool->getNumThreads());
    }
}

void RawFormatDownloadCallback::ImageFrameRequestComplete(
    ImageFrameRequest &request)
{
    log(LOGLEVEL::TRACE, "RawFormatDownloadCallback::ImageFrameRequestComplete - ImageFrameId %s\n", request.imageFrameId.c_str());
    if (request.status == -2) // cancelled
    {
        log(LOGLEVEL::DEBUG, "RawFormatDownloadCallback - ImageFrameId %s was cancelled\n", request.imageFrameId.c_str());
    }
    else if (request.status == -1) // error
    {
        log(LOGLEVEL::ERROR, "RawFormatDownloadCallback - ImageFrameId %s failed with http status code %d (%s)\n", request.imageFrameId.c_str(), request.httpCode, request.bytes->data());
    }
    else if (request.status == 0) // success
    {
        bytesDownloaded += request.bytes->size();

        // decode image
        DecodeRequest decodeRequest{
            .requestNumber = 0,
            .imageFrameRequest = request,
            .pCallback = &rawFormatDecodeCallback};

        pDecodeThreadPool->addTask(decodeRequest);
    }
}
