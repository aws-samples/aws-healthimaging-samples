
#pragma once
#include <string>

namespace AHIRetrieve
{

    /**
     * @brief Class which performs global curl init and cleanup for you.  Applications using this library need to make
     * sure that curl is properly initialized first and cleaned up.  Applications already using libcurl should have this
     * code in place.  Applications not using libcurl directly must make sure an instance of this class is created
     * before instantiating and using AHIRetrieve and make sure that instance is destroyed after AHIRetrieve is destroyed.
     *
     * For example:
     *
     *  int main(int argc, char** argv) {
     *      CURLGlobal curlGlobal;
     *      {
     *          AHIRetrieve ahiRetrieve;
     *          // use ahiRetrieve
     *      }
     *      return 0;
     *  }
     *
     */

    struct CURLGlobal
    {
        CURLGlobal(const char *globalTrace = "tcp,http/2,ssl");
        ~CURLGlobal();

    private:
        // prevent copying
        CURLGlobal(const CURLGlobal &) = delete;
        CURLGlobal &operator=(const CURLGlobal &) = delete;

        std::string globalTrace; // e.g. "tcp,http/2,ssl"
    };

} // Namespae AHIRetrieve
