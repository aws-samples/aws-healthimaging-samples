#include "ahi-retrieve/ahi-retrieve.h"
#include "ahi-retrieve/string-format.h"
#include "cxxopts.hpp"
#include <iostream>

using namespace AHIRetrieve;
ImageFrameDownloadCallback *getDownloadCallback(const std::string &format);

std::string getEnv(const char *pKey)
{
    const char *pValue = std::getenv(pKey);
    std::string result;
    if (pValue)
    {
        result = pValue;
    }
    return result;
}

void getRegion(std::string &result, const cxxopts::ParseResult &args)
{
    if (args.count("region"))
    {
        result = args["region"].as<std::string>();
    }
    else
    {
        result = getEnv("AWS_DEFAULT_REGION");
    }

    if (result.length() == 0)
    {
        throw "AWS Region is required";
    }
}

void getAWSAccessKeyId(std::string &result, const cxxopts::ParseResult &args)
{
    if (args.count("awsAccessKeyId"))
    {
        result = args["awsAccessKeyId"].as<std::string>();
    }
    else
    {
        result = getEnv("AWS_ACCESS_KEY_ID");
    }

    if (result.length() == 0)
    {
        throw "AWS Access Key Id is required";
    }
}

void getAWSSecretAccessKey(std::string &result, const cxxopts::ParseResult &args)
{
    if (args.count("awsSecretAccessKey"))
    {
        result = args["awsSecretAccessKey"].as<std::string>();
    }
    else
    {
        result = getEnv("AWS_SECRET_ACCESS_KEY");
    }

    if (result.length() == 0)
    {
        throw "AWS Secret Access Key is required";
    }
}

void getAWSSessionToken(std::string &result, const cxxopts::ParseResult &args)
{
    if (args.count("awsSessionToken"))
    {
        result = args["awsSessionToken"].as<std::string>();
    }
    else
    {
        result = getEnv("AWS_SESSION_TOKEN");
    }
}

void getEndpoint(std::string &result, const std::string &region, const cxxopts::ParseResult &args)
{
    if (args.count("endpoint"))
    {
        result = args["endpoint"].as<std::string>();
    }
    else
    {
        result = getEnv("AWS_HEALTH_IMAGING_ENDPOINT");
    }

    if (result.length() == 0)
    {
        result = stringFormat("https://runtime-medical-imaging.%s.amazonaws.com", region.c_str());
    }
}

void getMaxDownloadThreads(size_t &result, const cxxopts::ParseResult &args)
{
    result = args["downloadThreads"].as<int>();
    if (result == 0)
    {
        throw "MaxDownloadThreads must be > 0";
    }
}

void getNumConnectionsPerThread(size_t &result, const cxxopts::ParseResult &args)
{
    result = args["numConnectionsPerThread"].as<int>();
    if (result == 0)
    {
        throw "numConnectionsPerThread must be > 0";
    }
}

void getMaxDownloadTmaxConcurrentRequestsPerConnectionhreads(size_t &result, const cxxopts::ParseResult &args)
{
    result = args["maxConcurrentRequestsPerConnection"].as<int>();
    if (result == 0)
    {
        throw "maxConcurrentRequestsPerConnection must be > 0";
    }
}

AHIImageFrameRetrieveArgs getImageFrameRetrieveArgs(cxxopts::ParseResult &args)
{
    ImageFrameDownloadCallback *pCallback = getDownloadCallback(args["format"].as<std::string>());
    AHIImageFrameRetrieveArgs ifrargs(*pCallback);

    getRegion(ifrargs.region, args);
    getAWSAccessKeyId(ifrargs.awsAccessKeyId, args);
    getAWSSecretAccessKey(ifrargs.awsSecretAccessKey, args);
    getAWSSessionToken(ifrargs.awsSessionToken, args);
    getEndpoint(ifrargs.endpoint, ifrargs.region, args);
    getMaxDownloadThreads(ifrargs.numDownloadThreads, args);
    getNumConnectionsPerThread(ifrargs.numConnectionsPerThread, args);
    getMaxDownloadTmaxConcurrentRequestsPerConnectionhreads(ifrargs.maxConcurrentRequestsPerConnection, args);

    return ifrargs;
}