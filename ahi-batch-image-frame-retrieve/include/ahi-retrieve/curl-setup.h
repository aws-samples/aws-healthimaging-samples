#pragma once

namespace AHIRetrieve
{
    class CURLEasyHandle;

    /**
     * @brief Base class/struct for setting options on a CURL Easy Handle
     *
     */
    struct CURLSetup
    {
        virtual void setup(CURLEasyHandle &handle) = 0;
    };
}