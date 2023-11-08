#include "ahi-retrieve/version.h"
#include "cxxopts.hpp"
#include <iostream>
#include "ahi-retrieve/string-format.h"

using namespace AHIRetrieve;

cxxopts::Options makeOptions()
{
    cxxopts::Options options("ahi-retrieve", "High speed retreival of image frames from AWS HealthImaging");

    /*
        // VSCode auto formatting turns this into a single line which is hard to read.  Make changes here and then copy it down
        options.add_options()
            ("r,region", "The AWS region (required or AWS_DEFAULT_REGION env var)", cxxopts::value<std::string>())
            ("a,awsAccessKeyId", "The AWS access key and secret key (required or AWS_ACCESS_KEY_ID env var)", cxxopts::value<std::string>())
            ("s,awsSecretAccessKey", "The AWS access key and secret key (required or AWS_SECRET_ACCESS_KEY env var)", cxxopts::value<std::string>())
            ("o,awsSessionToken", "The AWS session token (optional or AWS_SESSION_TOKEN env var)", cxxopts::value<std::string>())
            ("i,input", "File path to input file (required)", cxxopts::value<std::vector<std::string>>())
            ("f,format", "Format to generate (jph|raw|mem)", cxxopts::value<std::string>()->default_value("raw"))
            ("c,downloadThreads", "Number of download threads", cxxopts::value<int>()->default_value("16"))
            ("d,decodeThreads", "Number of HTJ2K decode threads", cxxopts::value<int>()->default_value("10"))
            ("e,endpoint", "The endpoint to use (default: generated based on region)", cxxopts::value<std::string>())
            ("l,loglevel", "The loglevel to use (OFF|FATAL|ERROR|INFO|DEBUG|TRACE) (default: OFF)", cxxopts::value<std::string>()->default_value("OFF"))
            ("p,loops", "The number of loops to run", cxxopts::value<int>()->default_value("1"))
            ("t,sleepTime", "The sleep time in ms between each progress output", cxxopts::value<int>()->default_value("250"))
            ("x,numConnectionsPerThread", "The maximum number of connections per thread", cxxopts::value<int>()->default_value("1"))
            ("m,maxConcurrentRequestsPerConnection", "The maximum number of concurrent requests per connection", cxxopts::value<int>()->default_value("10"))
            ("h,help", "Print usage")("v,version", "Show the version");
    */
    options.add_options()("r,region", "The AWS region (required or AWS_DEFAULT_REGION env var)", cxxopts::value<std::string>())("a,awsAccessKeyId", "The AWS access key and secret key (required or AWS_ACCESS_KEY_ID env var)", cxxopts::value<std::string>())("s,awsSecretAccessKey", "The AWS access key and secret key (required or AWS_SECRET_ACCESS_KEY env var)", cxxopts::value<std::string>())("o,awsSessionToken", "The AWS session token (optional or AWS_SESSION_TOKEN env var)", cxxopts::value<std::string>())("i,input", "File path to input file (required)", cxxopts::value<std::vector<std::string>>())("f,format", "Format to generate (jph|raw|mem)", cxxopts::value<std::string>()->default_value("raw"))("c,downloadThreads", "Number of download threads", cxxopts::value<int>()->default_value("16"))("d,decodeThreads", "Number of HTJ2K decode threads", cxxopts::value<int>()->default_value("10"))("e,endpoint", "The endpoint to use (default: generated based on region)", cxxopts::value<std::string>())("l,loglevel", "The loglevel to use (OFF|FATAL|ERROR|INFO|DEBUG|TRACE) (default: OFF)", cxxopts::value<std::string>()->default_value("OFF"))("p,loops", "The number of loops to run", cxxopts::value<int>()->default_value("1"))("t,sleepTime", "The sleep time in ms between each progress output", cxxopts::value<int>()->default_value("250"))("x,numConnectionsPerThread", "The maximum number of connections per thread", cxxopts::value<int>()->default_value("1"))("m,maxConcurrentRequestsPerConnection", "The maximum number of concurrent requests per connection", cxxopts::value<int>()->default_value("10"))("h,help", "Print usage")("v,version", "Show the version");

    return options;
}

cxxopts::ParseResult parseCommandLineArguments(int argc, char **argv, cxxopts::Options &options)
{
    cxxopts::ParseResult args;

    try
    {
        args = options.parse(argc, argv);
    }
    catch (const cxxopts::exceptions::parsing &x)
    {
        std::cerr << "ahi-retrieve: " << x.what() << '\n';
        std::cerr << options.help() << std::endl;
        exit(1);
    }

    if (args.count("help"))
    {
        std::cout << options.help() << std::endl;
        exit(0);
    }

    if (args.count("version"))
    {
        std::cout << "ahi-retrieve version " << getVersion().c_str() << '\n';
        std::vector<std::pair<std::string, std::string>> dependencies = getDependencyVersions();
        dependencies.push_back(std::pair<std::string, std::string>("cxxopts", stringFormat("%d.%d.%d", CXXOPTS__VERSION_MAJOR, CXXOPTS__VERSION_MINOR, CXXOPTS__VERSION_PATCH)));

        for (size_t i = 0; i < dependencies.size(); i++)
        {
            std::cout << " + " << dependencies[i].first << " " << dependencies[i].second << "\n";
        }
        exit(0);
    }

    if (args.count("input") == 0)
    {
        std::cerr << "ahi-retrieve: You must supply at least one input file via -i or --input" << '\n';
        std::cerr << options.help() << std::endl;
        exit(1);
    }

    return args;
}