#pragma once
#include "ahi-retrieve/curl-setup.h"

#define _32KB 32 * 1024

namespace AHIRetrieve
{
    /**
     * @brief CURL request setup for increasing the buffer size that CURL uses for this request
     *
     */
    struct CURLBufferSize : public CURLSetup
    {
        virtual void setup(CURLEasyHandle &handle);

        /**
         * @brief CURL Default is 16kB which is smaller that some reads we receive
         *
         */
        long bufferSize{_32KB};
    };
}