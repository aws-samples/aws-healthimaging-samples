#pragma once
#include "ahi-retrieve/ahi-connection.h"
#include "ahi-retrieve/image-frame-download-callback.h"
#include "ahi-retrieve/image-frame-request.h"
#include "ahi-retrieve/prefix-logger.h"
#include "thread-pool.h"
#include "stopwatch.h"

#include <sstream>
#include <memory>
#include <map>
#include <thread>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <atomic>

typedef void CURLM;

namespace AHIRetrieve
{
    struct ImageFrameDownloadThreadContext;
    class ImageFrameRequest;
    struct ImageFrameDownloadThread;
    class AHIConnection;

    struct ImageFrameDownloadThreadPoolArgs
    {
        std::string region;
        std::string endpoint;
        std::string awsAccessSecretKey;
        std::string awsSessionToken;
        size_t numThreads{1};                          // Number of threads to use for downloading
        size_t numConnectionsPerThread{1};             // number of H2 connections per thread
        size_t maxConcurrentRequestsPerConnection{20}; // maximum concurrent requests/sessions per HTTP2 connection
        ImageFrameDownloadCallback &callback;
    };

    struct ImageFrameDownloadThreadPoolOptions
    {
        PrefixLogger logger;
    };

    /**
     * @brief A thread pool that handles downloading HTJ2K image frames from AWS HealthImaging
     *
     */
    class ImageFrameDownloadThreadPool : public ImageFrameDownloadCallback
    {
    public:
        ImageFrameDownloadThreadPool(const ImageFrameDownloadThreadPoolArgs &args, ImageFrameDownloadThreadPoolOptions options = ImageFrameDownloadThreadPoolOptions());
        virtual ~ImageFrameDownloadThreadPool();
        /**
         * @brief
         *
         * @param requests
         */
        void addDownloadRequests(std::vector<ImageFrameRequest> &requests);

        /**
         * @brief Checks to see if the thread pool is busy downloading images
         *
         * @return true - thread pool is downloading images
         * @return false - thread pool is idle waiting for download images
         */
        bool isBusy();

        /**
         * @brief Waits until the thread pool is idle
         *
         */
        void wait();

        /**
         * @brief Stops all pending downloads and returns once all threads have been stopped
         *
         */
        void stop();

        void cancelAll();

        /**
         * @brief Get the total bytes downloaded
         *
         * @return size_t
         */
        size_t getBytesDownloaded();

        /**
         * @brief Get the total number of image frames downloaded
         *
         * @return size_t
         */
        size_t getImageFramesDownloaded();

    protected:
        virtual void ImageFrameRequestComplete(ImageFrameRequest &request);

    private:
        static void threadStart(ImageFrameDownloadThread *pThread);

        void start();

        void run(ImageFrameDownloadThread &thread);
        int serviceConnection(AHIConnection &connection, PrefixLogger &logger);

        void getRequestsToAdd(std::vector<ImageFrameRequest> &requests, std::unique_lock<std::mutex> &lock, AHIConnection &connection, PrefixLogger &logger);

        ImageFrameDownloadThreadPoolArgs args;
        ImageFrameDownloadThreadPoolOptions options;
        std::string awsSigV4;
        std::vector<std::unique_ptr<ImageFrameDownloadThread>> threads;

        // begin mutex protected state
        std::mutex mutex;
        std::condition_variable condition;
        std::queue<ImageFrameRequest> imageFrameRequests;
        size_t nextImageFrameRequestNumber{0};
        // end mutex protected state

        std::atomic_bool shouldTerminate_{false};
        std::atomic_ulong pendingRequests{0};
        std::atomic_ulong bytesDownloaded{0};
        std::atomic_ulong imageFramesDownloaded{0};
    };

} // Namespae AHIRetrieve
