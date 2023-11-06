#pragma once

#include "ahi-retrieve/image-frame-download-callback.h"
#include "ahi-retrieve/decode-thread-pool.h"
#include "ahi-retrieve/image-frame-request.h"
#include "../../extern/openjphjs/src/FrameInfo.hpp"
#include <memory>
#include <vector>

namespace AHIRetrieve
{

    struct Result
    {
        ImageFrameRequest imageFrameRequest;
        FrameInfo frameInfo;
        std::shared_ptr<std::vector<unsigned char>> rawPixelData;
        /**
         * @brief Decode status
         *  -2 - Retrieve did not succeed (check imageFrameRequest.status for more info)
         *  -1 - Error during decode
         *   0 - Image frame succesfully decoded
         */
        int status;
    };

    class ImageFrameResultAccumulator : public AHIRetrieve::ImageFrameDownloadCallback, public AHIRetrieve::DecodeCallback
    {
    public:
        virtual void ImageFrameRequestComplete(ImageFrameRequest &request);
        virtual void ImageFrameDecoded(const AHIRetrieve::DecodeRequest &request, const FrameInfo &frameInfo, std::shared_ptr<std::vector<unsigned char>> bytes, double decodeTimeInMilliSeconds);
        virtual void ImageFrameDecodeFailed(const AHIRetrieve::DecodeRequest &request);

        std::vector<Result> getResults();

    private:
        std::mutex mutex;
        std::vector<Result> results;
    };
}
