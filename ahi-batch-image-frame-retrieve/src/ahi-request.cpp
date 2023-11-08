#include "ahi-retrieve/ahi-request.h"
#include "ahi-retrieve/curl-http2.h"
#include "ahi-retrieve/curl-no-signal.h"
#include "ahi-retrieve/curl-no-signal.h"
#include "ahi-retrieve/curl-buffer-size.h"
#include "ahi-retrieve/curl-http-headers.h"

using namespace AHIRetrieve;

CURLHTTP2 http2;
CURLNoSignal noSignal;
CURLBufferSize bufferSize;

AHIRequest::AHIRequest()
{
    handle = std::make_shared<CURLEasyHandle>();
    setups.push_back(&url);
    setups.push_back(&http2);
    setups.push_back(&noSignal);
    setups.push_back(&post);
    setups.push_back(&buffer);
    setups.push_back(&bufferSize);
}

void AHIRequest::addSetups(std::vector<CURLSetup *> setups)
{
    this->setups.insert(this->setups.end(), setups.begin(), setups.end());
}

void AHIRequest::setup()
{
    for (CURLSetup *setup : this->setups)
    {
        setup->setup(*handle);
    }
}
