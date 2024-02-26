#! /bin/sh

clear

# make sure directories exist and clean the image frame directory
mkdir -p build
mkdir -p imageFrames
rm -rf imageFrames/*

#rm -rf build/* 

export CMAKE_BUILD_TYPE=Debug

# use cmake to generate the makefile
if [ $(arch) = 'x86_64' ]
then
  (cd build && cmake --preset=default -DOJPH_DISABLE_INTEL_SIMD=OFF ..)
else
  (cd build && cmake --preset=default -DOJPH_DISABLE_INTEL_SIMD=ON ..)
fi

# Build it
#(cd build && make VERBOSE=1 -j) || { exit 1; }
(cd build && make -j) || { exit 1; }

# Run it
(cd imageFrames && ../build/apps/ahi-retrieve  -i "../test/ct2465.json")
