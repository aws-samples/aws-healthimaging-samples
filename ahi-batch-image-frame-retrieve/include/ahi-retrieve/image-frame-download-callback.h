#pragma once

namespace AHIRetrieve
{

    class ImageFrameRequest;

    /**
     * @brief Callback interface for ImageFrameRequest results
     *
     */
    class ImageFrameDownloadCallback
    {
    public:
        /**
         * @brief Invoked when an image frame download request has completed.  A completed request is in a terminal
         * state and will not be retried.  Check the request status attribute to determine the final state of the
         * request (success, failure or cancelled)
         */
        virtual void ImageFrameRequestComplete(ImageFrameRequest &request) = 0;
    };
}