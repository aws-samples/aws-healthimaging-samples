#include "ahi-retrieve/decode-thread-pool.h"
#include "ahi-retrieve/thread-pool.h"
#include "ahi-retrieve/stopwatch.h"
#include "ahi-retrieve/logger.h"
#include "HTJ2KDecoder.hpp"
#include <thread>
#include <queue>
#include <mutex>
#include <sstream>

using namespace AHIRetrieve;

DecodeThreadContext::DecodeThreadContext()
{
    pDecoder = new HTJ2KDecoder();
}
DecodeThreadContext::~DecodeThreadContext()
{
    delete pDecoder;
}

/**
 * @brief A thread pool that handles decoding of HTJ2K image frames.  The task is a vector of unsigned char which contains
 *        the HTJ2K image frame returned by AWS HealthImaging
 *
 */
DecodeThreadPool::DecodeThreadPool(const size_t numThreads) : ThreadPool<DecodeRequest, DecodeThreadContext>(numThreads)
{
}

/**
 * @brief Static function to return the recommended number of decode threads
 *
 * @return size_t
 */
size_t DecodeThreadPool::getHardwareConcurrency()
{
    size_t numThreads = std::thread::hardware_concurrency();
    if (numThreads == 0)
    {
        numThreads = 4;
    }
    return numThreads;
}

void DecodeThreadPool::executeTask(DecodeRequest &request, DecodeThreadContext &context)
{
    try
    {
        // pass a pointer to the encoded data
        context.pDecoder->setEncodedBytes(request.imageFrameRequest.bytes.get());

        // pass a pointer to a buffer to use to store the decoded data
        if (!request.decodedBuffer.get())
        {
            request.decodedBuffer = std::make_shared<std::vector<unsigned char>>();
        }
        context.pDecoder->setDecodedBytes(&(*request.decodedBuffer));

        // decode the HTJ2K image frame
        Stopwatch timer;
        context.pDecoder->decode();
        timer.stop();

        // get the image frame info (widht, height, bitsPerSample, signedness, componentCount)
        const FrameInfo &frameInfo = context.pDecoder->getFrameInfo();

        // invoke the callback with a reference to the  decoded data
        if (request.pCallback)
        {
            request.pCallback->ImageFrameDecoded(request, frameInfo, request.decodedBuffer, timer.getDurationInMs());
        }
    }
    catch (std::runtime_error &error)
    {
        log(LOGLEVEL::ERROR, "OpenJPH failed to decode ImageFrameId %s\n", request.imageFrameRequest.imageFrameId.c_str());
        if (request.pCallback)
        {
            request.pCallback->ImageFrameDecodeFailed(request);
        }
    }
}
