#pragma once
#include <string>
#include <vector>
#include <memory>

namespace AHIRetrieve
{

    /**
     * @brief Represents a single AHI ImageFrame request and the resulting image frame data
     *
     */
    struct ImageFrameRequest
    {
        ////////////////////
        //// inputs
        ////////////////////

        /**
         * @brief The datastore id
         * e.g. 169224ef14db49839f628fb887d50291
         *
         */
        std::string datastoreId;

        /**
         * @brief The imageSetId
         * e.g. d91be0830da6a8550ddef2491cf1f10b
         *
         */
        std::string imageSetId;

        /**
         * @brief The image frame id
         * e.g. 7a9d6d62177792250da227bd2815ef7c
         */
        std::string imageFrameId;

        ////////////////////
        //// outputs
        ////////////////////

        /**
         * @brief The status of this request
         *  -2 - cancelled
         *  -1 - error
         *   0 - success
         */
        int status;

        /**
         * @brief The http code
         * e.g. 200, 500
         */
        long httpCode;

        /**
         * @brief The time it took to download this image frame in micro seconds
         *
         */
        double downloadTimeInMicroSeconds;

        /**
         * @brief The buffer to fill with the image frame data or error message for errors
         * NOTE - The buffer will automatically be allocated if is not already.  You may
         *        want to re-use a previously allocated buffer to improve performance /
         *        reduce memory fragmentation.
         */
        std::shared_ptr<std::vector<unsigned char>> bytes;
    };

}