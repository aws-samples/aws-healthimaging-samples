#pragma once
#include "ahi-retrieve/prefix-logger.h"

namespace AHIRetrieve
{
    /**
     * @brief Class to log trace messages on method begin/end
     *
     */
    class Trace
    {
    public:
        Trace(const PrefixLogger &logger, const char *pMessage) : logger(logger), pMessage(pMessage)
        {
            logger.log(TRACE, "BEGIN - %s\n", pMessage);
        }

        ~Trace()
        {
            logger.log(TRACE, "END - %s\n", pMessage);
        }

    private:
        const PrefixLogger &logger;
        const char *pMessage;
    };
}