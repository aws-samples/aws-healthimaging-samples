#include "ahi-retrieve/curl-no-signal.h"
#include "ahi-retrieve/curl-easy-handle.h"
#include <curl/curl.h>

using namespace AHIRetrieve;

void CURLNoSignal::setup(CURLEasyHandle &handle)
{
    handle.setOpt(CURLOPT_NOSIGNAL, 1L);
}
