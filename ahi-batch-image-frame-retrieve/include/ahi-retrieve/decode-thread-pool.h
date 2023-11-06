#pragma once
#include <thread>
#include <queue>
#include <mutex>
#include <memory>
#include <sstream>
#include "thread-pool.h"
#include "stopwatch.h"
#include "image-frame-request.h"

struct FrameInfo;
class HTJ2KDecoder;

namespace AHIRetrieve
{

    /**
     * @brief Initializing an HTJ2KDecoder instance takes a few millisconds so use a thread context to store a HTJ2KDecoder instance per thread
     *        so we only pay this startup cost once per thread.
     *
     */
    struct DecodeThreadContext
    {
        DecodeThreadContext();
        ~DecodeThreadContext();
        HTJ2KDecoder *pDecoder;

    private:
        // prevent copying
        DecodeThreadContext(const DecodeThreadContext &) = delete;
        DecodeThreadContext &operator=(const DecodeThreadContext &) = delete;
    };

    // forward declaration
    struct DecodeRequest;

    /**
     * @brief Callback interface that is called each time an ImageFrame is decoded
     *
     */
    class DecodeCallback
    {
    public:
        /**
         * @brief Invoked when an image frame is decoded
         *
         * @param request
         * @param frameInfo
         * @param rawBytes
         * @param decodeTimeInMilliSeconds
         */
        virtual void ImageFrameDecoded(
            const DecodeRequest &request,
            const FrameInfo &frameInfo,
            std::shared_ptr<std::vector<unsigned char>> bytes,
            double decodeTimeInMilliSeconds) = 0;

        /**
         * @brief Invoked when there was an error decoding the image frame
         *
         * @param request
         */
        virtual void ImageFrameDecodeFailed(
            const DecodeRequest &request) = 0;
    };

    /**
     * @brief Object which describes an ImageFrame decode request
     *
     */
    struct DecodeRequest
    {
        size_t requestNumber;
        ImageFrameRequest imageFrameRequest;
        std::shared_ptr<std::vector<unsigned char>> decodedBuffer;
        DecodeCallback *pCallback;
    };

    /**
     * @brief A thread pool that handles decoding of HTJ2K image frames.  The task is a vector of unsigned char which contains
     *        the HTJ2K image frame returned by AWS Curie.
     *
     */
    class DecodeThreadPool : public ThreadPool<DecodeRequest, DecodeThreadContext>
    {
    public:
        DecodeThreadPool(const size_t numThreads = 0);

        /**
         * @brief Static function to return the number of threads available on the current system/hardware
         *
         * @return size_t
         */
        static size_t getHardwareConcurrency();

    protected:
        virtual void executeTask(DecodeRequest &request, DecodeThreadContext &context);
    };

} // Namespae AHIRetrieve
