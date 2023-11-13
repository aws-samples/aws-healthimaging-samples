#include "ahi-retrieve/curl-http2.h"
#include "ahi-retrieve/curl-easy-handle.h"
#include <curl/curl.h>

using namespace AHIRetrieve;

void CURLHTTP2::setup(CURLEasyHandle &handle)
{
    handle.setOpt(CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_2TLS);
    handle.setOpt(CURLOPT_PIPEWAIT, 1L); // wait for pipe connection to confirm
}
