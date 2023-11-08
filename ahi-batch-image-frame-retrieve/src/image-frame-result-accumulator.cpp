#include "ahi-retrieve/image-frame-result-accumulator.h"

using namespace AHIRetrieve;

extern AHIRetrieve::DecodeThreadPool decodeThreadPool;

void ImageFrameResultAccumulator::ImageFrameRequestComplete(ImageFrameRequest &request)
{
    if (request.status == -2)
    {
        std::unique_lock<std::mutex> lock(mutex);
        results.push_back({.imageFrameRequest = request});
    }
    else if (request.status == -1)
    {
        std::unique_lock<std::mutex> lock(mutex);
        results.push_back({.imageFrameRequest = request});
    }
    else if (request.status == 0)
    {
        AHIRetrieve::DecodeRequest decodeRequest{
            .requestNumber = 0,
            .imageFrameRequest = request,
            .pCallback = this};
        decodeThreadPool.addTask(decodeRequest);
    }
}

void ImageFrameResultAccumulator::ImageFrameDecoded(const AHIRetrieve::DecodeRequest &request, const FrameInfo &frameInfo, std::shared_ptr<std::vector<unsigned char>> bytes, double decodeTimeInMilliSeconds)
{
    std::unique_lock<std::mutex> lock(mutex);
    results.push_back({.imageFrameRequest = request.imageFrameRequest,
                       .frameInfo = frameInfo,
                       .rawPixelData = request.decodedBuffer,
                       .status = 0});
}

void ImageFrameResultAccumulator::ImageFrameDecodeFailed(const AHIRetrieve::DecodeRequest &request)
{
    std::unique_lock<std::mutex> lock(mutex);
    results.push_back({.imageFrameRequest = request.imageFrameRequest,
                       .status = -1});
}

std::vector<Result> ImageFrameResultAccumulator::getResults()
{
    std::unique_lock<std::mutex> lock(mutex);
    std::vector<Result> result = results;
    results.clear();
    return result;
}
