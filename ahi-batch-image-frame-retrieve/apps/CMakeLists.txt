add_executable(ahi-retrieve)

target_compile_features(ahi-retrieve PRIVATE cxx_std_20)

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
    cxxopts
)
