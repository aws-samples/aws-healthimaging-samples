#include "ahi-retrieve/curl-global.h"
#include "ahi-retrieve/ahi-retrieve.h"
#include "ahi-retrieve/string-format.h"
#include "ahi-retrieve/raw-format-download-callback.h"
#include "cxxopts.hpp"
#include <iostream>
#include <unistd.h>

using namespace AHIRetrieve;

extern RawFormatDownloadCallback rawFormatDownloadCallback;

// forward declarations
cxxopts::Options makeOptions();
cxxopts::ParseResult parseCommandLineArguments(int argc, char **argv, cxxopts::Options &options);
AHIImageFrameRetrieveArgs getImageFrameRetrieveArgs(cxxopts::ParseResult &args);
void retrieveAllInputFiles(AHIImageFrameRetrieve &ahiRetrieve, cxxopts::ParseResult &args);
void configureLogger(cxxopts::ParseResult &args);
void reportProgress(AHIImageFrameRetrieve &ahiRetrieve, size_t &totalBytesDownloaded, size_t &totalImageFramesDownloaded, float &totalDuration, int sleepTimeInMS);

int main(int argc, char **argv)
{
    cxxopts::Options options = makeOptions();

    try
    {
        cxxopts::ParseResult args = parseCommandLineArguments(argc, argv, options);

        AHIImageFrameRetrieveArgs ifrargs = getImageFrameRetrieveArgs(args);

        configureLogger(args);

        CURLGlobal curlGlobal;

        AHIImageFrameRetrieve ahiRetrieve(ifrargs);

        int loops = args["loops"].as<int>();

        for (int iteration = 0; iteration < loops; iteration++)
        {
            retrieveAllInputFiles(ahiRetrieve, args);

            size_t totalBytesDownloaded = 0;
            float totalDuration = 0.0f;
            size_t totalImageFramesDownloaded = 0;
            reportProgress(ahiRetrieve, totalBytesDownloaded, totalImageFramesDownloaded, totalDuration, args["sleepTime"].as<int>());

            ahiRetrieve.wait();
            rawFormatDownloadCallback.pDecodeThreadPool->wait();

            double MB = totalBytesDownloaded / 1024 / 1024;
            double Mbps = (double)MB * 8 / totalDuration * (1000.0);
            printf("%zu Image Frames Downloaded (%.3f MB compressed)  in %.0f ms (%.3f Mbps)\n", totalImageFramesDownloaded, MB, totalDuration, Mbps);

            if (loops > 1)
            {
                usleep(1 * 1000 * 1000); // sleep one second between each iteration
            }
        }
        ahiRetrieve.stop();
        rawFormatDownloadCallback.pDecodeThreadPool->stop();

        exit(0);
    }
    catch (std::exception &ex)
    {
        printf("ahi-retrieve: std::exception %s\n", ex.what());
    }
    catch (const char *pError)
    {
        printf("ahi-retrieve: error %s\n", pError);
    }

    std::cout << options.help() << std::endl;

    exit(1);

    return 0;
}