find_package(Threads REQUIRED)
find_package(NGHTTP2 REQUIRED) # only used by this library to get version info
find_package(OpenSSL REQUIRED) # only used by this library to get version info

# find_package(CURL REQUIRED) # only used by this library to get version info
file(GLOB HEADER_LIST CONFIGURE_DEPENDS "${PROJECT_SOURCE_DIR}/include/ahi-retrieve/*")

add_library(ahi-retrieve-lib STATIC)

include_directories(ahi-retrieve-lib PRIVATE
    ${NGHTTP2_INCLUDE_DIRS}
    ${OPENSSL_INCLUDE_DIR}
    ${CURL_INCLUDE_DIR}
    ${PROJECT_SOURCE_DIR}/extern/openjphjs/extern/OpenJPH/src/core/common
    ${PROJECT_SOURCE_DIR}/extern/json/single_include/nlohmann
)

target_compile_features(ahi-retrieve-lib PUBLIC cxx_std_17)
target_sources(ahi-retrieve-lib PRIVATE
    ahi-connection.cpp
    ahi-request.cpp
    ahi-retrieve.cpp
    curl-aws-sigv4.cpp
    curl-buffer-size.cpp
    curl-easy-handle.cpp
    curl-global.cpp
    curl-http-headers.cpp
    curl-http2.cpp
    curl-no-signal.cpp
    curl-post.cpp
    curl-url.cpp
    curl-write-to-buffer.cpp
    curl-verbose.cpp
    decode-thread-pool.cpp
    image-frame-download-thread-pool.cpp
    image-frame-result-accumulator.cpp
    jph-format-download-callback.cpp
    logger.cpp
    make-download-request.cpp
    make-output-directories.cpp
    parse-input-json.cpp
    raw-format-decode-callback.cpp
    raw-format-download-callback.cpp
    read-file-sync.cpp
    version.cpp
    write-file-sync.cpp
)

target_include_directories(ahi-retrieve-lib PUBLIC ${PROJECT_SOURCE_DIR}/include)

target_link_libraries(ahi-retrieve-lib PRIVATE
    ${CURL_LIBRARIES}
    openjph
    nlohmann_json::nlohmann_json
    libcurl
    ${CMAKE_THREAD_LIBS_INIT}
)

include_directories(
    ${CURL_INCLUDE_DIR}
    "${PROJECT_SOURCE_DIR}/extern/json/single_include/nlohmann"
    "${PROJECT_SOURCE_DIR}/extern/openjphjs/src"
)

source_group(TREE "${PROJECT_SOURCE_DIR}/include" PREFIX "Header Files" FILES ${HEADER_LIST})