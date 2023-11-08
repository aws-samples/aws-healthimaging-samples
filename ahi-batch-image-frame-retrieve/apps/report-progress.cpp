#include "ahi-retrieve/stopwatch.h"
#include <unistd.h>
#include "ahi-retrieve/ahi-retrieve.h"
#include "ahi-retrieve/raw-format-download-callback.h"

using namespace AHIRetrieve;
extern RawFormatDownloadCallback rawFormatDownloadCallback;

void reportProgress(AHIImageFrameRetrieve &ahiRetrieve, size_t &totalBytesDownloaded, size_t &totalImageFramesDownloaded, float &totalDuration, int sleepTimeInMS)
{
    Stopwatch stopwatch("ImageFrameDownload");
    size_t iteration = 1;
    size_t startingBytesDownloaded = ahiRetrieve.getBytesDownloaded();
    size_t startingImageFramesDownloaded = ahiRetrieve.getImageFramesDownloaded();
    while (ahiRetrieve.isBusy() || rawFormatDownloadCallback.pDecodeThreadPool->busy())
    {
        // printf("ahiRetrieve.isBusy=%d rawFormatDownloadCallback.pDecodeThreadPool->busy()=%d\n", ahiRetrieve.isBusy(), rawFormatDownloadCallback.pDecodeThreadPool->busy());

        usleep(sleepTimeInMS * 1000);
        float durationInMS = stopwatch.getDurationInMs();
        float durationSinceLastLoop = durationInMS - totalDuration;
        size_t bytesDownloaded = ahiRetrieve.getBytesDownloaded() - startingBytesDownloaded;
        totalImageFramesDownloaded = ahiRetrieve.getImageFramesDownloaded() - startingImageFramesDownloaded;
        double bytesDownloadedSinceLastLoop = bytesDownloaded - totalBytesDownloaded;
        double MB = bytesDownloadedSinceLastLoop / 1024.0 / 1024.0;
        double Mbps = (double)MB * 8 / (double)durationSinceLastLoop * 1000.0;
        size_t numQueuedDecodeTasks = rawFormatDownloadCallback.pDecodeThreadPool->getQueuedTaskCount();
        size_t numActiveDecodeTasks = rawFormatDownloadCallback.pDecodeThreadPool->getNumActive();
        size_t totalExecutedDecodeTasks = rawFormatDownloadCallback.pDecodeThreadPool->getNumTasksExecuted();
        printf("%.3f ms - %zu image frames downloaded (%.3f MB) downloaded in %.0f ms (%.3f Mbps)\n", totalDuration, totalImageFramesDownloaded, MB, durationSinceLastLoop, Mbps);
        totalBytesDownloaded = bytesDownloaded;
        totalDuration = durationInMS;
    }
}