#include "ahi-retrieve/curl-url.h"
#include "ahi-retrieve/curl-easy-handle.h"
#include "ahi-retrieve/logger.h"
#include <curl/curl.h>

using namespace AHIRetrieve;

void CURLURL::setup(CURLEasyHandle &handle)
{
    handle.setOpt(CURLOPT_URL, url);
}
