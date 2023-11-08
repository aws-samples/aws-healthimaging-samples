#include <string>
#include "ahi-retrieve/curl-setup.h"

namespace AHIRetrieve
{
    /**
     * @brief CURL request setup for enabling versbose mode
     *
     */
    struct CURLVerbose : public CURLSetup
    {
        virtual void setup(CURLEasyHandle &handle);

        long enableVerbose{0}; // 1 enabled, 0 disabled
    };
}