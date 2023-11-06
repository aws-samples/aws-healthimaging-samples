#include "ahi-retrieve/curl-post.h"
#include "ahi-retrieve/curl-easy-handle.h"
#include "ahi-retrieve/logger.h"
#include <curl/curl.h>

using namespace AHIRetrieve;

void CURLPost::setup(CURLEasyHandle &handle)
{
    handle.setOpt(CURLOPT_POST, 1L);
    handle.setOpt(CURLOPT_POSTFIELDSIZE, postData.length());
    handle.setOpt(CURLOPT_POSTFIELDS, postData);
}
