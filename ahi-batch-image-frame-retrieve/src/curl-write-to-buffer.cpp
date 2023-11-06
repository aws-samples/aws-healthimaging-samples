#include "ahi-retrieve/curl-write-to-buffer.h"
#include "ahi-retrieve/curl-easy-handle.h"
#include "ahi-retrieve/logger.h"
#include <curl/curl.h>
#include <atomic>
using namespace AHIRetrieve;

std::atomic_ulong bytesDownloaded = 0;

static size_t writeMemoryCallback(char *contents, size_t size, size_t nmemb, void *userp)
{
    log(LOGLEVEL::DEBUG, "size=%zu, nmemb=%zu, userp = %p\n", size, nmemb, userp);
    CURLWriteToBuffer *pRequest = (CURLWriteToBuffer *)(userp);
    size_t realsize = size * nmemb;
    pRequest->buffer->insert(pRequest->buffer->end(), (unsigned char *)contents, (unsigned char *)contents + realsize);
    bytesDownloaded += realsize;
    return realsize;
}

void CURLWriteToBuffer::setup(CURLEasyHandle &handle)
{
    if (!buffer)
    {
        buffer = std::make_shared<std::vector<unsigned char>>();
    }
    handle.setOpt(CURLOPT_WRITEFUNCTION, (void *)writeMemoryCallback);
    handle.setOpt(CURLOPT_WRITEDATA, (void *)this);
}

size_t CURLWriteToBuffer::getBytesDownloaded()
{
    return bytesDownloaded;
}
