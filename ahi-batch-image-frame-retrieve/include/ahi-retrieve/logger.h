#pragma once
#include <string>

namespace AHIRetrieve
{

    enum LOGLEVEL
    {
        OFF = 0,
        FATAL,
        ERROR,
        WARN,
        INFO,
        DEBUG,
        TRACE
    };

    typedef void (*LoggerCallback)(LOGLEVEL logLevel, const char *pMessage);

    /**
     * @brief Set the Logging Level
     *
     * @param logLevel
     * @return LOGLEVEL
     */
    LOGLEVEL setLoggingLevel(LOGLEVEL logLevel);

    /**
     * @brief Get the Logging Level
     *
     * @return LOGLEVEL
     */
    LOGLEVEL getLoggingLevel();

    /**
     * @brief Get the Log Level From a String object
     *
     * @param logLevelStr
     * @return LOGLEVEL
     */
    LOGLEVEL getLogLevelFromString(const std::string &logLevelStr);

    /**
     * @brief Get the String From Log Level object
     *
     * @param logLevel
     * @return std::string
     */
    std::string getStringFromLogLevel(LOGLEVEL logLevel);

    /**
     * @brief Set the Logging Callback Function object
     *
     * @param pLogCallback
     * @return LoggerCallback
     */
    LoggerCallback setLoggingFunction(LoggerCallback pLogCallback);

    /**
     * @brief Internal method called by ahi-trieve to log a message
     *
     * @param logLevel
     * @param pFormat
     * @param ...
     * @return true
     * @return false
     */
    bool log(LOGLEVEL logLevel, const char *pFormat, ...);

    /**
     * @brief Internal method called by ahi-trieve to log a message
     *
     * @param logLevel
     * @param pFormat
     * @param args - variable list of args
     * @return true
     * @return false
     */
    bool loga(LOGLEVEL logLevel, const char *pFormat, va_list args);

} // Namespae AHIRetrieve
