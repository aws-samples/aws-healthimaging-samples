#pragma once
#include "ahi-retrieve/image-frame-download-callback.h"
#include <memory>
#include <set>

namespace AHIRetrieve
{

    class JPHFormatDownloadCallback : public ImageFrameDownloadCallback
    {
    public:
        virtual void ImageFrameRequestComplete(ImageFrameRequest &request);

    private:
        std::set<std::string> imageFramePaths;
    };

} // Namespae AHIRetrieve
