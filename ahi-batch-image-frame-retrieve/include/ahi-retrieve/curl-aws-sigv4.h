#pragma once
#include "ahi-retrieve/curl-setup.h"
#include <string>

namespace AHIRetrieve
{
    /**
     * @brief CURL request setup for AWS SigV4 authentication
     *
     */
    struct CURLAwsSigV4 : public CURLSetup
    {
        virtual void setup(CURLEasyHandle &handle);

        /**
         * @brief The AWS SigV4 resource (provider1[:provider2[:region[:service]]])
         * e.g. aws:amz:us-east-1:medical-imaging
         */
        std::string awsSigV4;

        /**
         * @brief String containing the AWS AccessKeyId + ":" + AWS SecretAccessKey
         * e.g. XXXXXXXXXXXXXXXXXXXX:wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
         *
         */
        std::string awsAccessSecretKey;
    };
}