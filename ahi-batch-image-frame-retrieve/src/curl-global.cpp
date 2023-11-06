#include "ahi-retrieve/curl-global.h"
#include "ahi-retrieve/logger.h"
#include <curl/curl.h>

using namespace AHIRetrieve;

CURLGlobal::CURLGlobal(const char *globalTrace) : globalTrace(globalTrace)
{
    curl_global_init(CURL_GLOBAL_ALL);
    curl_global_trace(this->globalTrace.c_str());

    curl_version_info_data *data = curl_version_info(CURLVERSION_NOW);
    const char *const *featureNames = data->feature_names;
    log(DEBUG, "libcurl version: %s\n", data->version);
    while (*featureNames)
    {
        log(DEBUG, "libcurl feature: %s\n", *featureNames);
        featureNames++;
    }
}
CURLGlobal::~CURLGlobal()
{
    curl_global_cleanup();
}
