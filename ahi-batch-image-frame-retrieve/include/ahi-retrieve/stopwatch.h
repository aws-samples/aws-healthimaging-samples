#pragma once
#include <time.h>
#include <stdio.h>

namespace AHIRetrieve
{

    /**
     * @brief Simple timer class used to measure clock time.
     *
     */
    class Stopwatch
    {
    public:
        Stopwatch(const char *label = 0) : label_(label)
        {
            finish_.tv_nsec = 0;
            finish_.tv_sec = 0;
            start();
        }

        void start()
        {
            clock_gettime(CLOCK_REALTIME, &start_);
        }

        timespec stop()
        {
            clock_gettime(CLOCK_REALTIME, &finish_);
            sub_timespec(start_, finish_, &delta_);
            if (label_)
            {
                printf("%s took %.3f ms\n", label_, getDurationInMs());
            }
            return delta_;
        }

        float getDurationInMs()
        {
            clock_gettime(CLOCK_REALTIME, &finish_);
            sub_timespec(start_, finish_, &delta_);
            auto ns = delta_.tv_sec * 1000000000.0 + delta_.tv_nsec;
            auto totalTimeMS = ns / 1000000.0;
            return totalTimeMS;
        }

        ~Stopwatch()
        {
            if (finish_.tv_nsec == 0 && finish_.tv_sec == 0)
            {
                stop();
            }
        }

    private:
        enum
        {
            NS_PER_SECOND = 1000000000
        };

        void sub_timespec(struct timespec t1, struct timespec t2, struct timespec *td)
        {
            td->tv_nsec = t2.tv_nsec - t1.tv_nsec;
            td->tv_sec = t2.tv_sec - t1.tv_sec;
            if (td->tv_sec > 0 && td->tv_nsec < 0)
            {
                td->tv_nsec += NS_PER_SECOND;
                td->tv_sec--;
            }
            else if (td->tv_sec < 0 && td->tv_nsec > 0)
            {
                td->tv_nsec -= NS_PER_SECOND;
                td->tv_sec++;
            }
        }

        const char *label_;
        timespec start_, finish_, delta_;
    };

} // Namespae AHIRetrieve
