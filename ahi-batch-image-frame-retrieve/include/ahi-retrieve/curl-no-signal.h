#pragma once
#include "ahi-retrieve/curl-setup.h"
#include <string>

namespace AHIRetrieve
{
    /**
     * @brief CURL request setup for disabling signals (needed for multi-threaded use)
     *
     */
    struct CURLNoSignal : public CURLSetup
    {
        virtual void setup(CURLEasyHandle &handle);
    };
}