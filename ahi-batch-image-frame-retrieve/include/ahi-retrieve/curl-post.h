#include <string>
#include "ahi-retrieve/curl-setup.h"

namespace AHIRetrieve
{
    /**
     * @brief CURL request setup for data to be sent via POST
     *
     */
    struct CURLPost : public CURLSetup
    {
        virtual void setup(CURLEasyHandle &handle);

        std::string postData;
    };
}