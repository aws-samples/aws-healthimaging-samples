#pragma once
#include "ahi-retrieve/curl-setup.h"
#include <vector>
#include <memory>

namespace AHIRetrieve
{

    /**
     * @brief CURL request setup for capturing the response body
     *
     */
    struct CURLWriteToBuffer : CURLSetup
    {
        virtual void setup(CURLEasyHandle &handle);

        std::shared_ptr<std::vector<unsigned char>> buffer;

        static size_t getBytesDownloaded();
    };
}