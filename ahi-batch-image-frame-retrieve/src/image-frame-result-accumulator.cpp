#include "ahi-retrieve/image-frame-result-accumulator.h"

using namespace AHIRetrieve;

extern AHIRetrieve::DecodeThreadPool decodeThreadPool;

void ImageFrameResultAccumulator::ImageFrameRequestComplete(ImageFrameRequest &request)
{
    if (request.status == -2)
    {
        std::unique_lock<std::mutex> lock(mutex);
        Result result;
        result.imageFrameRequest = request;
        results.push_back(result);
    }
    else if (request.status == -1)
    {
        std::unique_lock<std::mutex> lock(mutex);
        Result result;
        result.imageFrameRequest = request;
        results.push_back(result);
    }
    else if (request.status == 0)
    {
        AHIRetrieve::DecodeRequest decodeRequest;
        decodeRequest.requestNumber = 0;
        decodeRequest.imageFrameRequest = request;
        decodeRequest.pCallback = this;
        decodeThreadPool.addTask(decodeRequest);
    }
}

void ImageFrameResultAccumulator::ImageFrameDecoded(const AHIRetrieve::DecodeRequest &request, const FrameInfo &frameInfo, std::shared_ptr<std::vector<unsigned char>> bytes, double decodeTimeInMilliSeconds)
{
    std::unique_lock<std::mutex> lock(mutex);
    Result result;
    result.imageFrameRequest = request.imageFrameRequest;
    result.frameInfo = frameInfo;
    result.rawPixelData = request.decodedBuffer;
    result.status = 0;
    results.push_back(result);
}

void ImageFrameResultAccumulator::ImageFrameDecodeFailed(const AHIRetrieve::DecodeRequest &request)
{
    std::unique_lock<std::mutex> lock(mutex);
    Result result;
    result.imageFrameRequest = request.imageFrameRequest;
    result.status = -1;
    results.push_back(result);
}

std::vector<Result> ImageFrameResultAccumulator::getResults()
{
    std::unique_lock<std::mutex> lock(mutex);
    std::vector<Result> result = results;
    results.clear();
    return result;
}
