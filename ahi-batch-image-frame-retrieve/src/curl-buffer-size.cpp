#include "ahi-retrieve/curl-buffer-size.h"
#include "ahi-retrieve/curl-easy-handle.h"
#include <curl/curl.h>

using namespace AHIRetrieve;

void CURLBufferSize::setup(CURLEasyHandle &handle)
{
    handle.setOpt(CURLOPT_BUFFERSIZE, bufferSize);
}
