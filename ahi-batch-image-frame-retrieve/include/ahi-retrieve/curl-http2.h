#pragma once
#include "ahi-retrieve/curl-setup.h"

namespace AHIRetrieve
{
    /**
     * @brief CURL request setup for HTTP2
     *
     */
    struct CURLHTTP2 : public CURLSetup
    {
        virtual void setup(CURLEasyHandle &handle);
    };
}