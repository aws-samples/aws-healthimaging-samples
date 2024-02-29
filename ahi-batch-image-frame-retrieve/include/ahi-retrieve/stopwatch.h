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
        }

        void stop()
        {
            finish_ = std::chrono::system_clock::now();
            delta_ = std::chrono::duration_cast<std::chrono::milliseconds>(finish_ - start_);

            if (label_)
            {
                printf("%s took %.3f ms\n", label_, getDurationInMs());
            }
        }

        float getDurationInMs()
        {
            finish_ = std::chrono::system_clock::now();
            delta_ = std::chrono::duration_cast<std::chrono::milliseconds>(finish_ - start_);

            return delta_.count();
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
