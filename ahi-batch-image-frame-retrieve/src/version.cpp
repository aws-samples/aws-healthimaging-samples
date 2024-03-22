#include "ahi-retrieve/version.h"
#include <nghttp2/nghttp2ver.h>
#include <curl/curlver.h>
#include <openssl/opensslv.h>
#include <nlohmann/json.hpp>
#include "ahi-retrieve/string-format.h"
#if defined(KAKADU)
#include "HTJ2KDecoder.hpp"
#else
#include "ojph_defs.h"
#endif

#define AUX(x) #x
#define STRINGIFY(x) AUX(x)

std::string AHIRetrieve::getVersion()
{
    return "1.0 beta-2";
}

std::vector<std::pair<std::string, std::string>> AHIRetrieve::getDependencyVersions()
{
    std::vector<std::pair<std::string, std::string>> result;
    result.push_back(std::pair<std::string, std::string>("libcurl", LIBCURL_VERSION));
    result.push_back(std::pair<std::string, std::string>("openssl", stringFormat("%d.%d.%d", OPENSSL_VERSION_MAJOR, OPENSSL_VERSION_MINOR, OPENSSL_VERSION_PATCH)));
    result.push_back(std::pair<std::string, std::string>("nghttp2", NGHTTP2_VERSION));
#if defined(KAKADU)
    result.push_back(std::pair<std::string, std::string>("Kakadu", KDU_CORE_VERSION));
#else
    result.push_back(std::pair<std::string, std::string>("OpenJPH", stringFormat("%d.%d.%s", OPENJPH_VERSION_MAJOR, OPENJPH_VERSION_MINOR, STRINGIFY(OPENJPH_VERSION_PATCH))));
#endif
    result.push_back(std::pair<std::string, std::string>("nlohmann json", stringFormat("%d.%d.%d", NLOHMANN_JSON_VERSION_MAJOR, NLOHMANN_JSON_VERSION_MINOR, NLOHMANN_JSON_VERSION_PATCH)));
    return result;
}