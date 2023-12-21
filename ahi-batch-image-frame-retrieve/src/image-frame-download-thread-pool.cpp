#include "ahi-retrieve/image-frame-download-thread-pool.h"
#include "ahi-retrieve/image-frame-request.h"
#include "ahi-retrieve/ahi-connection.h"
#include "ahi-retrieve/string-format.h"
#include "ahi-retrieve/logger.h"
#include "ahi-retrieve/trace.h"
#include <curl/curl.h>
#include <unistd.h>
#include <algorithm>

using namespace AHIRetrieve;

struct AHIRetrieve::ImageFrameDownloadThread
{
    size_t threadNumber;
    PrefixLogger logger;
    ImageFrameDownloadThreadPool *pPool;
    std::thread thread;
};

ImageFrameDownloadThreadPool::ImageFrameDownloadThreadPool(const ImageFrameDownloadThreadPoolArgs &args, ImageFrameDownloadThreadPoolOptions options) : args(args), nextImageFrameRequestNumber(0), options(options)
{
    Trace trace(options.logger, "ImageFrameDownloadThreadPool::ImageFrameDownloadThreadPool()");

    // Create endpoint if needed
    if (args.endpoint.length() == 0)
    {
        this->args.endpoint = stringFormat("https://runtime-medical-imaging.%s.amazonaws.com", args.region.c_str());
    }
    options.logger.log(INFO, "Using endpoint %s\n", this->args.endpoint.c_str());

    awsSigV4 = stringFormat("aws:amz:%s:medical-imaging", args.region.c_str());

    start();
}

ImageFrameDownloadThreadPool::~ImageFrameDownloadThreadPool()
{
    Trace trace(options.logger, "ImageFrameDownloadThreadPool::~ImageFrameDownloadThreadPool()");

    stop();
}

void ImageFrameDownloadThreadPool::ImageFrameRequestComplete(ImageFrameRequest &request)
{
    Trace trace(options.logger, "ImageFrameDownloadThreadPool::ImageFrameRequestComplete()");

    options.logger.log(DEBUG, "%d bytes downloaded\n", request.bytes->size());

    bytesDownloaded += request.bytes->size();
    imageFramesDownloaded++;
    if (--pendingRequests == 0)
    {
        condition.notify_all();
    }

    args.callback.ImageFrameRequestComplete(request);
}

size_t ImageFrameDownloadThreadPool::getBytesDownloaded()
{
    Trace trace(options.logger, "ImageFrameDownloadThreadPool::getBytesDownloaded()");

    return bytesDownloaded;
}

size_t ImageFrameDownloadThreadPool::getImageFramesDownloaded()
{
    Trace trace(options.logger, "ImageFrameDownloadThreadPool::getImageFramesDownloaded()");

    return imageFramesDownloaded;
}

void ImageFrameDownloadThreadPool::threadStart(ImageFrameDownloadThread *pThread)
{
    pThread->logger.prefixes.push_back(stringFormat("DT#%d", pThread->threadNumber));
    pThread->pPool->run(*pThread);
}

int ImageFrameDownloadThreadPool::serviceConnection(AHIConnection &connection, PrefixLogger &logger)
{
    // perform some work on the connection
    logger.log(DEBUG, "Peforming work on the connection\n");
    int pendingRequestCount = connection.tick();
    return pendingRequestCount;
}

void ImageFrameDownloadThreadPool::run(ImageFrameDownloadThread &thread)
{
    Trace trace(thread.logger, "ImageFrameDownloadThreadPool::run()");

    PrefixLogger &logger = thread.logger;

    std::shared_ptr<AHIRegion> ahiRegion = std::make_shared<AHIRegion>();
    ahiRegion->region = this->args.region;
    ahiRegion->endpoint = this->args.endpoint;
    ahiRegion->awsAccessSecretKey = this->args.awsAccessSecretKey;

    AHIConnectionArgs args{
        .ahiRegion = ahiRegion,
        .callback = *(this)};

    std::vector<std::shared_ptr<AHIConnection>> connections;
    for (int i = 0; i < this->args.numConnectionsPerThread; i++)
    {
        AHIConnectionOptions options;
        options.logger = logger;
        options.maxConcurrentRequestsPerConnection = this->args.maxConcurrentRequestsPerConnection;
        options.logger.prefixes.push_back(stringFormat("C#%d", i));

        connections.push_back(std::make_shared<AHIConnection>(args, options));
    }

    while (true)
    {
        int pendingRequestCount = 0;
        for (auto connection : connections)
        {
            pendingRequestCount += serviceConnection(*connection, logger);
        }

        // check to see if we should terminate
        if (shouldTerminate_)
        {
            logger.log(DEBUG, "Download thread terminating\n");
            break;
        }

        // acquire a mutex lock before accessing shared state
        std::unique_lock<std::mutex> lock(mutex);

        // if no new imageFrameRequests and no more requests pending, wait for a new request to be added
        if (imageFrameRequests.empty() && pendingRequestCount == 0)
        {
            logger.log(DEBUG, "No more requests to process, waiting\n");
            condition.wait(lock);
        }

        // get some image frame requests to add and release mutex lock
        std::vector<std::vector<ImageFrameRequest>> requestVec;
        for (auto connection : connections)
        {
            std::vector<ImageFrameRequest> requestsToAdd;
            getRequestsToAdd(requestsToAdd, lock, *connection, logger);
            requestVec.push_back(requestsToAdd);
            logger.log(DEBUG, "Adding %d requsts to connection\n", requestsToAdd.size());
        }
        // release the mutex lock since we are no longer accessing shared state
        lock.unlock();

        // add the requests to the connection
        size_t num = 0;
        for (auto connection : connections)
        {
            for (ImageFrameRequest &request : requestVec[num])
            {
                connection->addImageFrameRequest(request);
            }
            num++;
        }
    }
}

void ImageFrameDownloadThreadPool::getRequestsToAdd(std::vector<ImageFrameRequest> &requests, std::unique_lock<std::mutex> &lock, AHIConnection &connection, PrefixLogger &logger)
{
    Trace trace(logger, "ImageFrameDownloadThreadPool::getRequestsToAdd()");
    // Sanity check to make sure we have the mutex locked
    if (!lock.owns_lock())
    {
        log(FATAL, "getRequestsToAdd() called without mutex locked\n");
        return;
    }

    const size_t maxRequestsToAdd = (args.maxConcurrentRequestsPerConnection > connection.getRequestCount()) ? (args.maxConcurrentRequestsPerConnection - connection.getRequestCount()) : 0;
    size_t numRequestsToAdd = std::min(imageFrameRequests.size(), maxRequestsToAdd);
    if (numRequestsToAdd > 0)
    {
        options.logger.log(DEBUG, "Adding %d requests\n", numRequestsToAdd);
    }
    for (size_t i = 0; i < numRequestsToAdd; i++)
    {
        ImageFrameRequest &request = imageFrameRequests.front();
        requests.push_back(request);
        imageFrameRequests.pop();
    }
}

void ImageFrameDownloadThreadPool::addDownloadRequests(std::vector<ImageFrameRequest> &requests)
{
    Trace trace(options.logger, "ImageFrameDownloadThreadPool::addDownloadRequests())");
    {
        std::lock_guard<std::mutex> lock(mutex);

        pendingRequests += requests.size();

        for (size_t i = 0; i < requests.size(); i++)
        {
            imageFrameRequests.push(requests[i]);
        }
    }
    condition.notify_all();
}

bool ImageFrameDownloadThreadPool::isBusy()
{
    Trace trace(options.logger, "ImageFrameDownloadThreadPool::isBusy()");
    if (pendingRequests == 0)
    {
        return false;
    }
    else
    {
        return true;
    }
}

void ImageFrameDownloadThreadPool::wait()
{
    Trace trace(options.logger, "ImageFrameDownloadThreadPool::wait()");
    while (true)
    {
        if (pendingRequests == 0)
        {
            return;
        }
        {
            std::unique_lock<std::mutex> lock(mutex);
            if (pendingRequests == 0)
            {
                return;
            }
            condition.wait(lock);
        }
    }
}

void ImageFrameDownloadThreadPool::stop()
{
    Trace trace(options.logger, "ImageFrameDownloadThreadPool::stop()");
    bool wasTerminating = shouldTerminate_.exchange(true);
    if (wasTerminating)
    {
        return;
    }
    condition.notify_all();
    for (std::unique_ptr<ImageFrameDownloadThread> &thread : threads)
    {
        thread->thread.join();
    }
    threads.clear();
    imageFrameRequests = std::queue<ImageFrameRequest>();
    pendingRequests = 0;
}

void ImageFrameDownloadThreadPool::cancelAll()
{
    Trace trace(options.logger, "ImageFrameDownloadThreadPool::cancelAll()");
    stop();
    start();
}

void ImageFrameDownloadThreadPool::start()
{
    Trace trace(options.logger, "ImageFrameDownloadThreadPool::start()");
    for (size_t i = 0; i < args.numThreads; i++)
    {
        threads.push_back(std::unique_ptr<ImageFrameDownloadThread>(new ImageFrameDownloadThread()));
        threads[i]->threadNumber = i;
        threads[i]->logger = options.logger;
        threads[i]->pPool = this;
        threads[i]->thread = std::thread(threadStart, threads[i].get());
    }
}
