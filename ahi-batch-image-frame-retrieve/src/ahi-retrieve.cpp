#include "ahi-retrieve/ahi-retrieve.h"
#include "ahi-retrieve/input.h"
#include "ahi-retrieve/string-format.h"
#include "ahi-retrieve/logger.h"
#include "ahi-retrieve/image-frame-download-thread-pool.h"
#include "ahi-retrieve/curl-write-to-buffer.h"

using namespace AHIRetrieve;

std::vector<ImageFrameRequest> makeDownloadRequest(const AHIImageFrameRetrieveArgs &args, const quicktype::Input &input);
quicktype::Input parseInputJSON(const std::string &json);

AHIImageFrameRetrieve::AHIImageFrameRetrieve(const AHIImageFrameRetrieveArgs &args) : args(args)
{
    log(LOGLEVEL::INFO, "Starting %zu download threads\n", args.numDownloadThreads);

    ImageFrameDownloadThreadPoolArgs ifargs{.callback = args.callback};
    ifargs.region = args.region;
    ifargs.endpoint = args.endpoint;
    ifargs.awsAccessSecretKey = stringFormat("%s:%s", args.awsAccessKeyId.c_str(), args.awsSecretAccessKey.c_str());
    ifargs.awsSessionToken = args.awsSessionToken;
    ifargs.numThreads = args.numDownloadThreads;
    ifargs.numConnectionsPerThread = args.numConnectionsPerThread;
    ifargs.maxConcurrentRequestsPerConnection = args.maxConcurrentRequestsPerConnection;

    ImageFrameDownloadThreadPoolOptions options;
    imageFrameThreadPool = std::make_unique<ImageFrameDownloadThreadPool>(ifargs, options);
}

AHIImageFrameRetrieve::~AHIImageFrameRetrieve()
{
}

void AHIImageFrameRetrieve::addRequest(const RetrieveRequest &request)
{
    quicktype::Input input = parseInputJSON(request.requestJSON);

    std::vector<ImageFrameRequest> requests = makeDownloadRequest(args, input);
    imageFrameThreadPool->addDownloadRequests(requests);
}

bool AHIImageFrameRetrieve::isBusy()
{
    return imageFrameThreadPool->isBusy();
}

size_t AHIImageFrameRetrieve::getBytesDownloaded()
{
    return imageFrameThreadPool->getBytesDownloaded();
}

size_t AHIImageFrameRetrieve::getImageFramesDownloaded()
{
    return imageFrameThreadPool->getImageFramesDownloaded();
}

void AHIImageFrameRetrieve::wait()
{
    imageFrameThreadPool->wait();
}

void AHIImageFrameRetrieve::stop()
{
    imageFrameThreadPool->stop();
}
void AHIImageFrameRetrieve::cancelAll()
{
    imageFrameThreadPool->cancelAll();
}
