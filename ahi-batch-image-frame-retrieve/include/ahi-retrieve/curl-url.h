#pragma once
#include "ahi-retrieve/curl-setup.h"
#include <string>

namespace AHIRetrieve
{
    /**
     * @brief CURL request setup for the URL to call
     *
     */
    struct CURLURL : public CURLSetup
    {
        virtual void setup(CURLEasyHandle &handle);

        std::string url;
    };
}