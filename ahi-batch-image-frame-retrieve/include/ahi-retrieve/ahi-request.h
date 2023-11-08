#pragma once
#include "ahi-retrieve/curl-easy-handle.h"
#include "ahi-retrieve/curl-post.h"
#include "ahi-retrieve/curl-write-to-buffer.h"
#include "ahi-retrieve/curl-url.h"
#include <memory>

namespace AHIRetrieve
{
    /**
     * @brief Encapsulates everything needed to make a single request to AHI and handle the response
     *
     */
    struct AHIRequest
    {
        AHIRequest();

        /**
         * @brief Adds request setup parameters to the request
         *
         * @param setups
         */
        void addSetups(std::vector<CURLSetup *> setups);

        /**
         * @brief initializes the CURL easy connection with the various request setup parameters
         *
         */
        void setup();

        CURLURL url;
        CURLPost post;
        CURLWriteToBuffer buffer;

        std::shared_ptr<CURLEasyHandle> handle;
        std::vector<CURLSetup *> setups;
    };

}