#include "ahi-retrieve/ahi-retrieve.h"
#include "ahi-retrieve/string-format.h"
#include "ahi-retrieve/read-file-sync.h"
#include "ahi-retrieve/jph-format-download-callback.h"
#include "ahi-retrieve/raw-format-download-callback.h"
#include "cxxopts.hpp"

using namespace AHIRetrieve;

JPHFormatDownloadCallback jphFormatDownloadCallback;
RawFormatDownloadCallback rawFormatDownloadCallback;

ImageFrameDownloadCallback *getDownloadCallback(const std::string &format)
{
    if (format == "raw")
    {
        return &rawFormatDownloadCallback;
    }
    if (format == "jph")
    {
        return &jphFormatDownloadCallback;
    }
    return NULL;
}

void retrieveAllInputFiles(AHIImageFrameRetrieve &ahiRetrieve, cxxopts::ParseResult &args)
{
    auto inputFiles = args["input"].as<std::vector<std::string>>();

    rawFormatDownloadCallback.init(args["decodeThreads"].as<int>());

    ImageFrameDownloadCallback *pCallback = getDownloadCallback(args["format"].as<std::string>());

    for (size_t i = 0; i < inputFiles.size(); i++)
    {
        RetrieveRequest request;
        readFileSync(inputFiles[i].c_str(), request.requestJSON);
        ahiRetrieve.addRequest(request);
    }
}
