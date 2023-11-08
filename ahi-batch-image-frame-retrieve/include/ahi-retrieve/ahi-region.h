#pragma once
#include <string>

namespace AHIRetrieve
{

    struct AHIRegion
    {
        /**
         * @brief The AWS Region
         * e.g. us-east-1
         */
        std::string region;
        /**
         * @brief The http endpoint to use.  Leave this blank when using AWS HealthImaging
         * e.g. https://localhost/ for a service running locally that implements the AWS HealthImaging API
         */
        std::string endpoint;
        /**
         * @brief String containing the AWS AccessKeyId + ":" + AWS SecretAccessKey
         * e.g. XXXXXXXXXXXXXXXXXXXX:wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
         *
         */
        std::string awsAccessSecretKey;

        /**
         * @brief The AWS session token (for temporary credentials via STS).  Optional
         *
         */
        std::string awsSessionToken;
    };

}