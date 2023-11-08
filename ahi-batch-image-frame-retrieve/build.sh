#! /bin/sh

clear

# make sure directories exist and clean the image frame directory
mkdir -p build
mkdir -p imageFrames
rm -rf imageFrames/*

# use cmake to generate the makefile
if [ $(arch) = 'x86_64' ]
then
  (cd build && cmake -DCMAKE_BUILD_TYPE=Release -DOJPH_DISABLE_INTEL_SIMD=OFF ..)
else
  (cd build && cmake -DCMAKE_BUILD_TYPE=Release -DOJPH_DISABLE_INTEL_SIMD=ON ..)
  #(cd build && cmake -DCMAKE_BUILD_TYPE=Debug -DOJPH_DISABLE_INTEL_SIMD=ON ..)
fi

# Build it
#(cd build && make VERBOSE=1 -j) || { exit 1; }
(cd build && make -j) || { exit 1; }

# Run it
#(cd imageFrames && ../build/apps/ahi-retrieve -f raw -l INFO -c 16 -d 10 -p 5 -t 250 -m 20 -i "../test/ct2465.json")
(cd imageFrames && ../build/apps/ahi-retrieve  -i "../test/ct2465.json")
#(cd imageFrames && ../build/apps/ahi-retrieve -e "https://iad-runtime.external-healthlake-imaging.ai.aws.dev" -f jph  -i "../cta.json" -p 5 -l DEBUG -m 10 -c 32 -d 5 > out.log)
#(cd imageFrames && ../build/apps/ahi-retrieve -e "https://iad-runtime.external-healthlake-imaging.ai.aws.dev" -f jph -c 1 -d 10 -i "../cta.json" -p 20 -l WARN -m 256)
#(cd imageFrames && ../build/apps/ahi-retrieve -e "https://iad-runtime.external-healthlake-imaging.ai.aws.dev" -f jph -c 1 -d 10 -i "../cta.json" -p 20 -l WARN -m 256)

