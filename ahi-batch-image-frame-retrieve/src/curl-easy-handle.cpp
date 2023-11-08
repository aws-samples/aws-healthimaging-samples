#include "ahi-retrieve/curl-easy-handle.h"
#include "ahi-retrieve/logger.h"
#include <curl/curl.h>

using namespace AHIRetrieve;

CURLEasyHandle::CURLEasyHandle() : easyHandle(0)
{
    this->easyHandle = curl_easy_init();
    log(DEBUG, "EasyHandle = %p\n", this->easyHandle);
}

CURLEasyHandle::~CURLEasyHandle()
{
    log(DEBUG, "~CURLEasyHandle EasyHandle = %p\n", this->easyHandle);
    curl_easy_cleanup(easyHandle);
}

CURL *CURLEasyHandle::get()
{
    return easyHandle;
}

static void check(CURLcode code)
{
    if (code != CURLE_OK)
    {
        throw code;
    }
}

void CURLEasyHandle::setOpt(CURLoption opt, const std::string &value)
{
    check(curl_easy_setopt(easyHandle, opt, value.c_str()));
}

void CURLEasyHandle::setOpt(CURLoption opt, long value)
{
    check(curl_easy_setopt(easyHandle, opt, value));
}

void CURLEasyHandle::setOpt(CURLoption opt, void *value)
{
    check(curl_easy_setopt(easyHandle, opt, value));
}
