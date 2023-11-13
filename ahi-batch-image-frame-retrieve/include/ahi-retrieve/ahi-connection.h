#pragma once
#include "ahi-retrieve/ahi-region.h"
#include "ahi-retrieve/prefix-logger.h"
#include <string>
#include <map>
#include <vector>
#include <memory>

namespace AHIRetrieve
{
    // Forward declarations
    class ImageFrameDownloadCallback;
    class ImageFrameRequest;
    struct AHIConnectionImpl;

    /**
     * @brief Arguments for creating an AHIConnection
     *
     */
    struct AHIConnectionArgs
    {
        std::shared_ptr<AHIRegion> ahiRegion;
        ImageFrameDownloadCallback &callback;
    };

    struct AHIConnectionOptions
    {
        PrefixLogger logger;
        int timeoutInMS{1};                            // The select polling timeout when processing data on this connection
        bool curlVerboseEnabled{false};                // enables verbose CURL logging
        size_t maxConcurrentRequestsPerConnection{10}; // NOTE - currently (Nov 8, 2023) performance does not improve over 10 with AHI.  This will hopefully change in the future
    };

    /**
     * @brief Instances of this class encapsulate a single HTTP2 connection to AWS HealthImaging which can send multiple requests concurrently
     *
     * General
     *
     */
    class AHIConnection
    {
    public:
        AHIConnection(AHIConnectionArgs &args, AHIConnectionOptions options = AHIConnectionOptions());
        ~AHIConnection();

        /**
         * @brief Adds an ImageFrameRequest to be downloaded from this connection
         *
         * @param request
         */
        void addImageFrameRequest(ImageFrameRequest &request);

        /**
         * @brief Performs one tick of processing on the connection.
         *
         * @return int
         */
        int tick();

        /**
         * @brief Returns the total number of bytes downloaded by this connection
         *
         * @return size_t
         */
        size_t getBytesDownloaded() const;

        size_t getRequestCount() const;

    private:
        // prevent copying
        AHIConnection(const AHIConnection &) = delete;
        AHIConnection &operator=(const AHIConnection &) = delete;

        size_t handle();
        void setup(size_t requestId);

        AHIConnectionArgs &args;
        AHIConnectionOptions options;

        std::unique_ptr<AHIConnectionImpl> impl;
    };

} // namespace AHIRetrieve