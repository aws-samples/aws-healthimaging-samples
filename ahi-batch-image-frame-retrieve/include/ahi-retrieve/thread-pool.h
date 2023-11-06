#pragma once
#include <thread>
#include <queue>
#include <mutex>
#include <condition_variable>

namespace AHIRetrieve
{

    /**
     * @brief Base class for a thread pool that executes tasks of type T.
     *
     * @tparam T Type that describes a task to be executed by the thread pool
     * @tparam Y Type that holds thread specific context to be re-used between tasks
     */

    template <class T, class Y>
    class ThreadPool
    {
    public:
        ThreadPool(const size_t numThreads) : shouldTerminate_(false),
                                              numActive_(0),
                                              numTasksExecuted_(0)
        {
            addThreads(numThreads);
        }

        /**
         * @brief Adds a task to thread pool to execute when a thread becomes available
         *
         * @param task The task to execute
         */
        void addTask(const T &task)
        {

            {
                std::unique_lock lock(mutex_);
                tasks_.push(task);
            }

            condition_.notify_one();
        }

        /**
         * @brief Tests to see if the thread pool is bus executing tasks
         *
         * @return true - thread pool is busy executing tasks
         * @return false - thread pool is idle
         */
        bool busy()
        {
            {
                std::unique_lock<std::mutex> lock(mutex_);
                if (tasks_.empty() && numActive_ == 0)
                {
                    return false;
                }
                else
                {
                    return true;
                }
            }
        }

        /**
         * @brief Returns once all tasks have completed executing
         *
         */
        void wait()
        {
            while (true)
            {
                std::unique_lock<std::mutex> lock(mutex_);
                if (tasks_.empty() && numActive_ == 0)
                {
                    return;
                }
                waitCondition_.wait(lock);
            }
        }

        /**
         * @brief Stops all threads in the thread pool and returns once they have all terminated
         *
         */
        void stop()
        {
            {
                std::unique_lock<std::mutex> lock(mutex_);
                shouldTerminate_ = true;
            }
            condition_.notify_all();
            for (std::thread &active_thread : threads_)
            {
                active_thread.join();
            }
            threads_.clear();
        }

        /**
         * @brief Returns the number of threads in the thread pool
         *
         * @return size_t - numnber of threads in the thread pool
         */
        size_t getNumThreads()
        {
            return threads_.size();
        }

        size_t getNumActive()
        {
            return numActive_;
        }

        /**
         * @brief Get the total number of tasks executed by this thread pool
         *
         * @return size_t
         */
        size_t getNumTasksExecuted()
        {
            return numTasksExecuted_;
        }

        /**
         * @brief Returns the number of queued tasks
         *
         * @return size_t
         */
        size_t getQueuedTaskCount()
        {
            std::unique_lock<std::mutex> lock(mutex_);
            return tasks_.size();
        }

        /**
         * @brief Increases the number of threads in the thread pool
         *
         * @param numThreads the number of threads to add to thread pool
         */
        void addThreads(size_t numThreads)
        {
            {
                std::unique_lock<std::mutex> lock(mutex_);
                size_t currentSize = threads_.size();
                threads_.resize(currentSize + numThreads);
                for (size_t i = currentSize; i < threads_.size(); i++)
                {
                    threads_.at(i) = std::thread(threadStart, this);
                }
            }
        }

    protected:
        /**
         * @brief Pure virtual function that sub classes must implement to execute a task
         *
         */
        virtual void executeTask(T &, Y &) = 0;

        /**
         * @brief The main thread run loop
         *
         * @param context
         */
        virtual void run(Y &context)
        {
            while (true)
            {
                std::unique_lock<std::mutex> lock(mutex_);

                if (shouldTerminate_)
                {
                    break;
                }

                if (tasks_.empty())
                {
                    condition_.wait(lock);
                }

                if (tasks_.empty())
                {
                    continue;
                }

                T request = tasks_.front();
                numActive_++;
                tasks_.pop();
                lock.unlock();

                executeTask(request, context);

                numTasksExecuted_++;

                lock.lock();
                numActive_--;

                waitCondition_.notify_all();
            }
        }

        /**
         * @brief Virtual function to initialize a thread context
         *
         * @param context
         */
        virtual void initializeThreadContext(Y &context) {}

    private:
    private:
        // prevent copying
        ThreadPool(const ThreadPool &) = delete;
        ThreadPool &operator=(const ThreadPool &) = delete;

        /**
         * @brief Thread entry point
         *
         * @param pool
         */
        static void threadStart(ThreadPool<T, Y> *pool)
        {
            Y context;
            pool->initializeThreadContext(context);
            pool->run(context);
        }

        bool shouldTerminate_;
        size_t numActive_;
        std::vector<std::thread> threads_;
        std::mutex mutex_;
        std::condition_variable condition_;
        std::condition_variable waitCondition_;
        std::queue<T> tasks_;
        size_t numTasksExecuted_;
    };

} // Namespae AHIRetrieve
