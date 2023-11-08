#pragma once
#include "raw-format-decode-callback.h"
#include "image-frame-download-callback.h"

#include <memory>

namespace AHIRetrieve
{

    class RawFormatDownloadCallback : public ImageFrameDownloadCallback
    {
    public:
        RawFormatDownloadCallback();
        ~RawFormatDownloadCallback();

        void init(size_t numDecodeThreads);

        virtual void ImageFrameRequestComplete(ImageFrameRequest &request);

        DecodeThreadPool *pDecodeThreadPool;
        RawFormatDecodeCallback rawFormatDecodeCallback;

        size_t bytesDownloaded;
    };

} // Namespae AHIRetrieve
