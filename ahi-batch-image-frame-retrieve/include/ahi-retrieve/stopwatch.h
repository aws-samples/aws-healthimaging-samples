#pragma once
#include <time.h>
#include <stdio.h>
#include <chrono>

namespace AHIRetrieve
{

    typedef std::chrono::high_resolution_clock Clock;

    /**
     * @brief Simple timer class used to measure clock time.
     *
     */
    class Stopwatch
    {
    public:
        Stopwatch(const char *label = 0) : label_(label)
        {
            start();
        }

        void start()
        {
            start_ = std::chrono::system_clock::now();
            // clock_gettime(CLOCK_REALTIME, &start_);
        }

        void stop()
        {
            finish_ = std::chrono::system_clock::now();
            delta_ = std::chrono::duration_cast<std::chrono::milliseconds>(finish_ - start_);

            // clock_gettime(CLOCK_REALTIME, &finish_);
            // sub_timespec(start_, finish_, &delta_);
            if (label_)
            {
                printf("%s took %.3f ms\n", label_, getDurationInMs());
            }
            // return delta_;
        }

        float getDurationInMs()
        {
            finish_ = std::chrono::system_clock::now();
            delta_ = std::chrono::duration_cast<std::chrono::milliseconds>(finish_ - start_);

            // clock_gettime(CLOCK_REALTIME, &finish_);
            // sub_timespec(start_, finish_, &delta_);
            // auto ns = delta_.tv_sec * 1000000000.0 + delta_.tv_nsec;
            // auto totalTimeMS = ns / 1000000.0;
            return delta_.count();
            // return totalTimeMS;
        }

        ~Stopwatch()
        {
            if (finish_ == std::chrono::time_point<std::chrono::system_clock>{})
            {
                stop();
            }
        }

    private:
        const char *label_;
        std::chrono::time_point<std::chrono::system_clock> start_, finish_;
        std::chrono::milliseconds delta_;
    };

} // Namespae AHIRetrieve
