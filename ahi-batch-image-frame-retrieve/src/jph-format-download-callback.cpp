#include "ahi-retrieve/jph-format-download-callback.h"
#include "ahi-retrieve/image-frame-request.h"
#include "ahi-retrieve/write-file-sync.h"
#include "ahi-retrieve/logger.h"
#include "ahi-retrieve/string-format.h"
#include "ahi-retrieve/make-output-directories.h"
#include <sys/types.h>
#include <sys/stat.h>

using namespace AHIRetrieve;

void JPHFormatDownloadCallback::ImageFrameRequestComplete(
    ImageFrameRequest &request)
{
    log(LOGLEVEL::TRACE, "JPHFormatDownloadCallback - request for imageFrameId %s", request.imageFrameId.c_str());
    if (request.status == -2) // cancelled
    {
        log(LOGLEVEL::DEBUG, "JPHFormatDownloadCallback - request for imageFrameId %s cancelled\n", request.imageFrameId.c_str());
        return;
    }
    else if (request.status == -1) // failure
    {
        log(LOGLEVEL::ERROR, "JPHFormatDownloadCallback - request for imageFrameId %s failed with http status code %d (%s)\n", request.imageFrameId.c_str(), request.httpCode, (const char *)request.bytes->data());
        return;
    }
    else if (request.status == 0) // success
    {
        std::string imageFramePath = stringFormat("%s/%s",
                                                  request.datastoreId.c_str(),
                                                  request.imageSetId.c_str());

        if (imageFramePaths.find(imageFramePath) == imageFramePaths.end())
        {
            imageFramePaths.insert(imageFramePath);
            makeOutputDirectories(request.datastoreId.c_str(), request.imageSetId.c_str());
        }

        std::string fileName = stringFormat("%s/%s/%s.jph",
                                            request.datastoreId.c_str(),
                                            request.imageSetId.c_str(),
                                            request.imageFrameId.c_str());

        writeFileSync(fileName.c_str(), *(request.bytes));
    }
}
