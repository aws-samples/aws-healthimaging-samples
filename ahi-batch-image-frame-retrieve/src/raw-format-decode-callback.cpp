#include "ahi-retrieve/raw-format-decode-callback.h"
#include "ahi-retrieve/decode-thread-pool.h"
#include "ahi-retrieve/write-file-sync.h"
#include "ahi-retrieve/logger.h"
#include "ahi-retrieve/string-format.h"
#include "ahi-retrieve/make-output-directories.h"
#include <set>
#include <string>

using namespace AHIRetrieve;

void RawFormatDecodeCallback::ImageFrameDecoded(const DecodeRequest &request, const FrameInfo &frameInfo, std::shared_ptr<std::vector<unsigned char>> bytes, double decodeTimeInMilliSeconds)
{
    log(LOGLEVEL::TRACE, "RawFormatDecodeCallback - ImageFrameId %s decoded for request #%zu in %.2f ms\n", request.imageFrameRequest.imageFrameId.c_str(), request.requestNumber, decodeTimeInMilliSeconds);

    std::string imageFramePath = stringFormat("%s/%s",
                                              request.imageFrameRequest.datastoreId.c_str(),
                                              request.imageFrameRequest.imageSetId.c_str());

    if (imageFramePaths.find(imageFramePath) == imageFramePaths.end())
    {
        imageFramePaths.insert(imageFramePath);
        makeOutputDirectories(request.imageFrameRequest.datastoreId.c_str(), request.imageFrameRequest.imageSetId.c_str());
    }

    char buffer[2048];
    std::string fileName = stringFormat("%s/%s/%s.raw",
                                        request.imageFrameRequest.datastoreId.c_str(),
                                        request.imageFrameRequest.imageSetId.c_str(),
                                        request.imageFrameRequest.imageFrameId.c_str());

    writeFileSync(fileName.c_str(), *bytes);
}

void RawFormatDecodeCallback::ImageFrameDecodeFailed(const DecodeRequest &request)
{
    log(LOGLEVEL::ERROR, "RawFormatDecodeCallback - ImageFrame %s decode failed for request #%zu\n", request.imageFrameRequest.imageFrameId.c_str(), request.requestNumber);
}
