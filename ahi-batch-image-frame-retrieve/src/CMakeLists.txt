find_package(Threads REQUIRED)
find_package(NGHTTP2 1.56.0 REQUIRED)
find_package(OpenSSL 3.1.3 REQUIRED)
find_package(CURL 8.4.0 REQUIRED)
find_package(nlohmann_json 3.11.3 REQUIRED)

file(GLOB HEADER_LIST CONFIGURE_DEPENDS "${PROJECT_SOURCE_DIR}/include/ahi-retrieve/*")

add_library(ahi-retrieve-lib STATIC)

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
    ${CMAKE_THREAD_LIBS_INIT}
    ${CURL_LIBRARIES}
    ${HTJ2K_LIBRARIES}
    nlohmann_json::nlohmann_json
)

if(KAKADU_ROOT)
    target_compile_definitions(ahi-retrieve-lib PRIVATE KAKADU)
endif()

target_include_directories(ahi-retrieve-lib PRIVATE
    ${CURL_INCLUDE_DIR}
    ${NLOHMANN_JSON_INCLUDE_DIR}
    ${HTJ2K_INCLUDES}
)

source_group(TREE "${PROJECT_SOURCE_DIR}/include" PREFIX "Header Files" FILES ${HEADER_LIST})