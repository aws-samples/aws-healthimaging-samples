#include "ahi-retrieve/curl-http-headers.h"
#include "ahi-retrieve/curl-easy-handle.h"
#include "ahi-retrieve/logger.h"
#include <curl/curl.h>

using namespace AHIRetrieve;

CURHTTPHeaders::CURHTTPHeaders() : list(NULL)
{
}

CURHTTPHeaders::~CURHTTPHeaders()
{
    curl_slist_free_all(list); // safe to pass NULL
}

void CURHTTPHeaders::setup(CURLEasyHandle &handle)
{
    if (!headers.size())
    {
        return;
    }
    for (std::string header : headers)
    {
        list = curl_slist_append(list, header.c_str());
    }
    handle.setOpt(CURLOPT_HTTPHEADER, list);
}
