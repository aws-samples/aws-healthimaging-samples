#include "ahi-retrieve/logger.h"
#include "cxxopts.hpp"
#include <string>

using namespace AHIRetrieve;

void loggerCallback(LOGLEVEL logLevel, const char *pMessage)
{
    std::string logLevelStr = getStringFromLogLevel(logLevel);
    printf("%s %s", logLevelStr.c_str(), pMessage);
}

void configureLogger(cxxopts::ParseResult &args)
{
    std::string logLevelStr = args["loglevel"].as<std::string>();
    LOGLEVEL logLevel = getLogLevelFromString(logLevelStr);
    setLoggingLevel(logLevel);
    setLoggingFunction(&loggerCallback);
}
