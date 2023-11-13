#pragma once
#include "ahi-retrieve/curl-setup.h"
#include <string>
#include <vector>
#include <utility>

struct curl_slist;

namespace AHIRetrieve
{
    /**
     * @brief CURL request setup for the URL to call.
     *
     */
    struct CURHTTPHeaders : public CURLSetup
    {
        CURHTTPHeaders();
        ~CURHTTPHeaders();

        virtual void setup(CURLEasyHandle &handle);

        std::vector<std::string> headers; // string format = "HTTPHEADER: VALUE"
        curl_slist *list;
    };
}