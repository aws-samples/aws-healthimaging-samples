#pragma once
#include <string>
#include <memory>

namespace AHIRetrieve
{
    class ImageFrameDownloadThreadPool;
    class ImageFrameDownloadCallback;
    /**
     * @brief Required arguments for image frame retreival
     *
     */
    struct AHIImageFrameRetrieveArgs
    {
        AHIImageFrameRetrieveArgs(ImageFrameDownloadCallback &callback) : callback(callback) {}
        std::string region; // aws region - e.g. "use-east-1"
        std::string awsAccessKeyId;
        std::string awsSecretAccessKey;
        std::string awsSessionToken;
        std::string endpoint;                          // AHI region endpoint - e.g https://runtime-medical-imaging.us-east-1.amazonaws.com
        size_t numDownloadThreads{4};                  // Number of threads to use for downloading
        size_t numConnectionsPerThread{1};             // Number of HTTP/2 connections per gthread
        size_t maxConcurrentRequestsPerConnection{10}; // Maximum concurrent requests/sessions per HTTP/2 connection.
        // size_t maxRetries{5};                          // maximum number of times to retry a request (not yet implemented)
        ImageFrameDownloadCallback &callback;
    };

    struct RetrieveRequest
    {
        std::string requestJSON; // json describing the request
    };

    /**
     * @brief Class that executes image retreival requests
     *
     */

    class AHIImageFrameRetrieve
    {
    public:
        AHIImageFrameRetrieve(const AHIImageFrameRetrieveArgs &args);
        ~AHIImageFrameRetrieve();

        /**
         * @brief Adds a retreival request to the queue to be executed in another thread
         *
         * @param request
         */
        void addRequest(const RetrieveRequest &request);

        /**
         * @brief Returns the total number of bytes downloaded so far
         *
         * @return size_t
         */
        size_t getBytesDownloaded();

        /**
         * @brief Get the total numnber of Image Frames downloaded
         *
         * @return size_t
         */
        size_t getImageFramesDownloaded();

        /**
         * @brief Check to see if AHIRetrieve is currently busy executing retrieve tasks
         *
         * @return true
         * @return false
         */
        bool isBusy();

        /**
         * @brief Waits until all requests complete and then returns
         *
         */
        void wait();

        /**
         * @brief Waits until all background retreival threads are shutdown
         *
         */
        void stop();

        /**
         * @brief Cancels all pending requests.  Does not return until all requests have been cancelled
         *
         */
        void cancelAll();

    private:
        // prevent copying
        AHIImageFrameRetrieve(const AHIImageFrameRetrieve &) = delete;
        AHIImageFrameRetrieve &operator=(const AHIImageFrameRetrieve &) = delete;

        // private data
        AHIImageFrameRetrieveArgs args;
        std::unique_ptr<ImageFrameDownloadThreadPool> imageFrameThreadPool;
    };

} // Namespae AHIRetrieve
