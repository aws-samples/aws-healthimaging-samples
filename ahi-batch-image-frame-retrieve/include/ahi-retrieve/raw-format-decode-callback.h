#pragma once
#include "decode-thread-pool.h"
#include "write-file-sync.h"
#include "logger.h"
#include "string-format.h"
#include "make-output-directories.h"
#include <set>
#include <string>

namespace AHIRetrieve
{

    class RawFormatDecodeCallback : public DecodeCallback
    {
    public:
        virtual void ImageFrameDecoded(const DecodeRequest &request, const FrameInfo &frameInfo, std::shared_ptr<std::vector<unsigned char>> bytes, double decodeTimeInMilliSeconds);

        virtual void ImageFrameDecodeFailed(const DecodeRequest &request);

    private:
        std::set<std::string> imageFramePaths;
    };

} // Namespae AHIRetrieve
