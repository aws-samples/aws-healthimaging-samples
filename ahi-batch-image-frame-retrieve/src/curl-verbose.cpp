#include "ahi-retrieve/curl-verbose.h"
#include "ahi-retrieve/curl-easy-handle.h"
#include "ahi-retrieve/logger.h"
#include <curl/curl.h>

using namespace AHIRetrieve;

void CURLVerbose::setup(CURLEasyHandle &handle)
{
    handle.setOpt(CURLOPT_VERBOSE, enableVerbose);
}
