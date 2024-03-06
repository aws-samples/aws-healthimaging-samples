add_executable(ahi-retrieve)

find_package(cxxopts 3.1.1 REQUIRED)

target_compile_features(ahi-retrieve PRIVATE cxx_std_14)

target_sources(ahi-retrieve PRIVATE
    ahi-retrieve.cpp
    parseCommandLineArguments.cpp
    getImageFrameRetrieveArgs.cpp
    retreiveAllInputFiles.cpp
    configure-logger.cpp
    report-progress.cpp
)

target_link_libraries(ahi-retrieve PRIVATE
    ahi-retrieve-lib
    cxxopts::cxxopts
)
