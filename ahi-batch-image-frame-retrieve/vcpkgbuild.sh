#! /bin/sh

clear

# make sure directories exist and clean the image frame directory
mkdir -p build
mkdir -p imageFrames
rm -rf imageFrames/*

rm -rf build/* 

export CMAKE_BUILD_TYPE=Release # | Debug
#export VERBOSE=1

# use cmake to generate the makefile
if [ $(arch) = 'x86_64' ]
then
  (cmake -S . -B build --preset=default -DCMAKE_BUILD_TYPE=$CMAKE_BUILD_TYPE -DOJPH_DISABLE_INTEL_SIMD=OFF) || (exit 1;)
else
  (cmake -S . -B build --preset=default -DCMAKE_BUILD_TYPE=$CMAKE_BUILD_TYPE -DOJPH_DISABLE_INTEL_SIMD=ON) || (exit 1;)
fi

# Build it
(cmake --build build --  -j) || (exit 1;)

# Run it
(cd imageFrames && ../build/apps/ahi-retrieve  -i "../test/ct2465.json")
