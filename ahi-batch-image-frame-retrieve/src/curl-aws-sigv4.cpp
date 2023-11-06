#include "ahi-retrieve/curl-aws-sigv4.h"
#include "ahi-retrieve/curl-easy-handle.h"
#include "ahi-retrieve/logger.h"
#include <curl/curl.h>

using namespace AHIRetrieve;

void CURLAwsSigV4::setup(CURLEasyHandle &handle)
{
    handle.setOpt(CURLOPT_AWS_SIGV4, awsSigV4);
    handle.setOpt(CURLOPT_USERPWD, awsAccessSecretKey);
}
