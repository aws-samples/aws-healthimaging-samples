#pragma once
#include "ahi-retrieve/curl-setup.h"
#include <string>
#include <curl/curl.h>
#include <vector>
#include <memory>

typedef void CURL;

namespace AHIRetrieve
{
    /**
     * @brief Encapsulates a CURL easy handle and setting up its options
     *
     */
    class CURLEasyHandle
    {
    public:
        CURLEasyHandle();
        ~CURLEasyHandle();

        void setOpt(CURLoption opt, const std::string &value);
        void setOpt(CURLoption opt, long value);
        void setOpt(CURLoption opt, void *value);

        CURL *get();

    private:
        CURL *easyHandle;
        std::vector<std::shared_ptr<CURLSetup>> setups;
    };
}