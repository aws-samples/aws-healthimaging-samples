set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/CMake;${CMAKE_MODULE_PATH}")

cmake_minimum_required(VERSION 3.22.1)

project(AHIRetrieve, LANGUAGES CXX)

option(BUILD_SHARED_LIBS "Build using shared libraries" OFF)


# set the build type if not specified
set(default_build_type "Release")
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  message(STATUS "Setting build type to '${default_build_type}' as none was specified.")
  set(CMAKE_BUILD_TYPE "${default_build_type}")
endif()

set(OJPH_ENABLE_TIFF_SUPPORT OFF CACHE BOOL "")
set(OJPH_BUILD_EXECUTABLES OFF CACHE BOOL "")
add_subdirectory(${PROJECT_SOURCE_DIR}/extern/openjphjs EXCLUDE_FROM_ALL)

add_subdirectory(${PROJECT_SOURCE_DIR}/extern/cxxopts EXCLUDE_FROM_ALL) 

set(BUILD_CURL_EXE OFF CACHE BOOL "") 
set(HTTP_ONLY ON CACHE BOOL "")
set(ENABLE_THREADED_RESOLVER ON CACHE BOOL "")
set(USE_NGHTTP2 ON CACHE BOOL "")
set(CURL_DISABLE_NTLM ON CACHE BOOL "")
set(CURL_USE_LIBPSL OFF CACHE BOOL "")
set(CURL_USE_LIBSSH2 OFF CACHE BOOL "")
set(USE_UNIX_SOCKETS OFF CACHE BOOL "")
add_subdirectory(${PROJECT_SOURCE_DIR}/extern/curl EXCLUDE_FROM_ALL) 

set(JSON_BuildTests OFF CACHE INTERNAL "") # do not build/run tests for json lib
set(JSON_Install OFF CACHE INTERNAL "") # do not install json headers when this lib is installed
add_subdirectory(${PROJECT_SOURCE_DIR}/extern/json EXCLUDE_FROM_ALL)

# Only do these if this is the main project, and not if it is included through add_subdirectory
if(CMAKE_PROJECT_NAME STREQUAL PROJECT_NAME)

    # Optionally set things like CMAKE_CXX_STANDARD, CMAKE_POSITION_INDEPENDENT_CODE here
    
    # Let's ensure -std=c++xx instead of -std=g++xx
    set(CMAKE_CXX_EXTENSIONS OFF)

    # Let's nicely support folders in IDE's
    set_property(GLOBAL PROPERTY USE_FOLDERS ON)

    # Testing only available if this is the main app
    # Note this needs to be done in the main CMakeLists
    # since it calls enable_testing, which must be in the
    # main CMakeLists.
    include(CTest)

endif()

# The compiled library code is here
add_subdirectory(src)

# The executable code is here
add_subdirectory(apps)

# Testing only available if this is the main app
# Emergency override MODERN_CMAKE_BUILD_TESTING provided as well
if((CMAKE_PROJECT_NAME STREQUAL PROJECT_NAME OR MODERN_CMAKE_BUILD_TESTING) AND BUILD_TESTING)
    #add_subdirectory(tests)
endif()