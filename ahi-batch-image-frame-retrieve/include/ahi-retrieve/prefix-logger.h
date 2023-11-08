#pragma once
#include "ahi-retrieve/logger.h"
#include <cstdarg>
#include <vector>
#include <string>

namespace AHIRetrieve
{
    /**
     * @brief Class which prefixes one or more string before logging that string.
     * Use this to capture state such as thread id, connetion id, request id, etc
     *
     */
    struct PrefixLogger
    {
        bool log(LOGLEVEL logLevel, const char *pFormat, ...) const
        {
            if (logLevel > getLoggingLevel())
            {
                return false;
            }

            std::string format("");
            if (prefixes.size())
            {
                for (std::string prefix : prefixes)
                {
                    format += prefix;
                    format += "|";
                }
                format += ") ";
            }

            format += pFormat;

            va_list args;
            va_start(args, pFormat);
            auto result = loga(logLevel, format.c_str(), args);
            va_end(args);
            return result;
        }

        // push prefixes here
        std::vector<std::string> prefixes;
    };

} // namespace AHIRetrieve
