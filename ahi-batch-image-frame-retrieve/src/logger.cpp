#include "ahi-retrieve/logger.h"
#include <stdarg.h>
#include <stdio.h>
#include <string>

namespace AHIRetrieve
{

    static LOGLEVEL CurrentLogLevel = OFF;
    static LoggerCallback currentLoggerCallback = 0;

    LOGLEVEL setLoggingLevel(LOGLEVEL logLevel)
    {
        LOGLEVEL oldLogLevel = CurrentLogLevel;

        CurrentLogLevel = logLevel;

        return oldLogLevel;
    }

    LOGLEVEL getLoggingLevel()
    {
        return CurrentLogLevel;
    }

    LoggerCallback setLoggingFunction(LoggerCallback callback)
    {
        LoggerCallback oldCallback = currentLoggerCallback;
        currentLoggerCallback = callback;
        return oldCallback;
    }

    bool loga(LOGLEVEL logLevel, const char *pFormat, va_list args)
    {
        if (logLevel > CurrentLogLevel)
        {
            return false;
        }

#define BUFFER_SIZE 2048
        char buffer[BUFFER_SIZE];
        if (vsnprintf(buffer, BUFFER_SIZE, pFormat, args) == -1)
        {
            // something wrong with pformat or the args... just log the pFormat string
            (currentLoggerCallback)(logLevel, pFormat);
            return true;
        }
        (currentLoggerCallback)(logLevel, buffer);
        return true;
    }

    bool log(LOGLEVEL logLevel, const char *pFormat, ...)
    {
        if (logLevel > CurrentLogLevel)
        {
            return false;
        }

        va_list args;
        va_start(args, pFormat);

#define BUFFER_SIZE 2048
        char buffer[BUFFER_SIZE];
        if (vsnprintf(buffer, BUFFER_SIZE, pFormat, args) == -1)
        {
            // something wrong with pformat or the args... just log the pFormat string
            va_end(args);
            (currentLoggerCallback)(logLevel, pFormat);
            return true;
        }

        va_end(args);
        (currentLoggerCallback)(logLevel, buffer);
        return true;
    }

    LOGLEVEL getLogLevelFromString(const std::string &logLevelStr)
    {
        if (logLevelStr == "OFF")
        {
            return OFF;
        }
        else if (logLevelStr == "FATAL")
        {
            return FATAL;
        }
        else if (logLevelStr == "ERROR")
        {
            return ERROR;
        }
        else if (logLevelStr == "WARN")
        {
            return WARN;
        }
        else if (logLevelStr == "INFO")
        {
            return INFO;
        }
        else if (logLevelStr == "DEBUG")
        {
            return DEBUG;
        }
        else if (logLevelStr == "TRACE")
        {
            return TRACE;
        }
        throw "unknown log level";
    }

    std::string getStringFromLogLevel(LOGLEVEL logLevel)
    {
        if (logLevel == OFF)
        {
            return "OFF";
        }
        else if (logLevel == FATAL)
        {
            return "FATAL";
        }
        else if (logLevel == ERROR)
        {
            return "ERROR";
        }
        else if (logLevel == WARN)
        {
            return "WARN";
        }
        else if (logLevel == INFO)
        {
            return "INFO";
        }
        else if (logLevel == DEBUG)
        {
            return "DEBUG";
        }
        else if (logLevel == TRACE)
        {
            return "TRACE";
        }
        throw "unknown log level";
    }

}
