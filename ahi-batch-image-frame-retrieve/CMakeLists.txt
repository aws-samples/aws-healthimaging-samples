set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/CMake;${CMAKE_MODULE_PATH}")

cmake_minimum_required(VERSION 3.22.1)

project(AHIRetrieve, LANGUAGES CXX)

find_path(KAKADU_ROOT NAMES Enabling_HT.txt HINTS ${CMAKE_SOURCE_DIR}/extern/kakadujs/extern/* NO_CACHE)

option(BUILD_SHARED_LIBS "Build using shared libraries" OFF)

# set the build type if not specified
set(default_build_type "Release")

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  message(STATUS "Setting build type to '${default_build_type}' as none was specified.")
  set(CMAKE_BUILD_TYPE "${default_build_type}")
endif()

if(KAKADU_ROOT)
  message("BUILDING WITH KAKADU")
  set(HTJ2K_LIBRARIES "kakadu" "kakaduappsupport" "kakadujs")
  set(HTJ2K_INCLUDES "${PROJECT_SOURCE_DIR}/extern/kakadujs/src")

  # include_directories("${PROJECT_SOURCE_DIR}/extern/kakadujs/extern/kakadu")
  add_subdirectory(${PROJECT_SOURCE_DIR}/extern/kakadujs EXCLUDE_FROM_ALL)
else()
  message("BUILDING WITH OPENJPH")
  set(OJPH_ENABLE_TIFF_SUPPORT OFF CACHE BOOL "")
  set(OJPH_BUILD_EXECUTABLES OFF CACHE BOOL "")
  set(HTJ2K_LIBRARIES "openjph")
  set(HTJ2K_INCLUDES "${PROJECT_SOURCE_DIR}/extern/openjphjs/src")
  add_subdirectory(${PROJECT_SOURCE_DIR}/extern/openjphjs EXCLUDE_FROM_ALL)
endif()

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
  # add_subdirectory(tests)
endif()