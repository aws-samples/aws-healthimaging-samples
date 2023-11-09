# AHI Batch Image Frame Retrieval

- [Description](#description)
- [Status](#status)
- [Features](#features)
- [Building the CLI Application](#building-the-cli-application)
- [Using the C++ Library](#using-the-c-library)
- [Using the CLI](#using-the-cli)
- [Performance Tuning](#performance-tuning)
- [TODO](#todo)
- [Security](#security)
- [License](#license)

## Description

This repository contains a C++ library and command line tool that performs high speed batch image frame retrieval from AWS HealthImaging. These can be used to rapidly download large data sets to support various workflows such as AI/ML training, AI/ML inference, image processing and visualization. This is helpful because existing applications are implemented in a variety of languages and runtimes many of which have limitations related to concurrent downloads and decompression that prevent them from fully utilizing AHI's performance.

## Status

This project is considered beta quality. All GA features are fully implemented with basic testing. Additional testing to verify the quality is occuring before moving it to GA.

This project is known to build on the following platforms:

-   Mac OS X 13.6 (M1 Pro), Apple clang version 15.0.0, CMake 3.27.6, nghttp2 1.56.0 and openssl 3.1.3
-   Ubuntu 22.04.2 ARM64, g++ 11.4.0, CMake 3.22.1, nghttp2 1.43.0 and openssl 3.0.2

This project may require some tweaks for Windows builds

## Features

-   Concurrent download of multiple image frames over multiple threads and multiple HTTP/2 connections
-   Concurrent decoding of HTJ2K image frames with multiple threads after downloaded
-   Callback design makes it easy to customize post download workflows (e.g. conversion to other file formats or file names)
-   Includes callback implementations for common workflows (e.g. save ImageFrames to disk in HTJ2K (jph) or uncompressed (raw) formats)
-   Design and implementation optimized for extremly high performance
-   Library logging can be integrated with application logging system

## Building the CLI Application

### Pre-requisites

-   C++ build tools that support [C++20](https://en.wikipedia.org/wiki/C%2B%2B20). Older compilers could probably be supported with minimal changes.
-   [CMake](https://cmake.org/) version 3.22.1 or later (e.g. on Ubuntu - sudo apt install cmake)
-   [openssl](https://github.com/openssl/openssl) version 3.0.2 or later (e.g. on Ubuntu - sudo apt install libssl-dev)
-   [nghttp2](https://nghttp2.org/) version 1.43.0 or later (e.g. on Ubuntu - sudo apt-get install -y libnghttp2-dev)

Note: Older versions of the above may work but have not been tested

### Initilize git submodules

From the git repository root directory:

```sh
> git submodule update --init --recursive
```

### Create build directory

```sh
> cd ahi-batch-image-frame-retrieve
> mkdir build
```

### Generate makefile with cmake

```sh
> cd build
# for Intel processors:
> cmake -DCMAKE_BUILD_TYPE=Release -DOJPH_DISABLE_INTEL_SIMD=OFF ..
# for non intel processors (ARM/Apple Silicon)
> cmake -DCMAKE_BUILD_TYPE=Release -DOJPH_DISABLE_INTEL_SIMD=ON ..
```

NOTE - OpenJPH currently features SIMD acceleration on Intel processors only. ARM is not currently accelerated with SIMD

### Build

```sh
> make -j
```

## Using the C++ Library

This C++ library is built using [modern cmake](https://cliutils.gitlab.io/modern-cmake/) principles. This means you can add this git repository as a submodule, include it in your project using cmake add_subdirectory() and link to it using target_link_librar(${APP_NAME} ahi-retrieve-lib). See the cli application for an example of using the C++ library. Note that you can create your own ImageFrameDownloadCallback implementation to control the post download workflow (e.g. decode the image frame and copy the result into the memory buffer of another runtime such as NodeJS or Python)

## Using the CLI

ahi-retrieve takes as input one or more [JSON documents](docs/input.md) as input files. These input files describe the ImageFrames to download from AWS HealthImaging. ahi-retrieve will download all image frames in parallel for each input file using the configured download threads and download connections. Once an ImageFrame is downloaded, the format parameter describes whether or not to save the HTJ2K encoded (jph) files to disk or to decompress them first (raw). Each ImageFrame is saved as a separate file with the imageFrameId followed by the format extension (e.g. 7a9d6d62177792250da227bd2815ef7c.raw or 7a9d6d62177792250da227bd2815ef7c.jpc). These files are stored in a directory structure in the current working directory which includes the datastoreId and imageSetId. For example:

169224ef14db49839f628fb887d50291/d91be0830da6a8550ddef2491cf1f10b/7a9d6d62177792250da227bd2815ef7c.raw

ImageFrames are always downloaded and saved overwriting existing files of the same name if they exist. It is up to the caller to manage deletion of the ImageFrame files.

See performance tuning section below for more information.

```sh
$ build/apps/ahi-retrieve --help
High speed retreival of image frames from AWS HealthImaging
Usage:
  ahi-retrieve [OPTION...]

  -r, --region arg              The AWS region (required or
                                AWS_DEFAULT_REGION env var)
  -a, --awsAccessKeyId arg      The AWS access key and secret key (required
                                or AWS_ACCESS_KEY_ID env var)
  -s, --awsSecretAccessKey arg  The AWS access key and secret key (required
                                or AWS_SECRET_ACCESS_KEY env var)
  -o, --awsSessionToken arg     The AWS session token (optional or
                                AWS_SESSION_TOKEN env var)
  -i, --input arg               File path to input file (required)
  -f, --format arg              Format to generate (jph|raw|mem) (default:
                                raw)
  -c, --downloadThreads arg     Number of download threads (default: 1)
  -d, --decodeThreads arg       Number of HTJ2K decode threads (default:
                                10)
  -e, --endpoint arg            The endpoint to use (default: generated
                                based on region)
  -l, --loglevel arg            The loglevel to use
                                (OFF|FATAL|ERROR|INFO|DEBUG|TRACE)
                                (default: OFF) (default: OFF)
  -p, --loops arg               The number of loops to run (default: 1)
  -t, --sleepTime arg           The sleep time in ms between each progress
                                output (default: 250)
  -x, --numConnectionsPerThread arg
                                The maximum number of connections per
                                thread (default: 1)
  -m, --maxConcurrentRequestsPerConnection arg
                                The maximum number of concurrent requests
                                per connection (default: 10)
  -h, --help                    Print usage
  -v, --version                 Show the version

$ build/apps/ahi-retrieve --version
ahi-retrieve version 1.0 beta
  libcurl 8.4.0-DEV
  openssl 3.1.3
  nghttp2 1.56.0
  OpenJPH 0.9.0
  nlohmann json 3.11.2
  cxxopts 3.1.1
$ build/apps/ahi-retrieve -r us-east-1 -a ABCDEFGHIJKLMNOPQRST -s aBcDeFgHiJkLmNoPqRsTuVwXyZaBcDeFgHiJkLmN -i test/ct2465.json
Retreival starting
0.000 ms - 0 image frames downloaded (0.000 MB) downloaded in 251 ms (0.000 Mbps)
251.247 ms - 0 image frames downloaded (0.000 MB) downloaded in 255 ms (0.000 Mbps)
506.003 ms - 100 image frames downloaded (17.050 MB) downloaded in 250 ms (545.075 Mbps)
756.244 ms - 239 image frames downloaded (23.837 MB) downloaded in 254 ms (749.361 Mbps)
1010.717 ms - 350 image frames downloaded (19.016 MB) downloaded in 255 ms (597.238 Mbps)
1265.431 ms - 460 image frames downloaded (18.857 MB) downloaded in 255 ms (591.660 Mbps)
1520.408 ms - 572 image frames downloaded (19.144 MB) downloaded in 255 ms (600.719 Mbps)
1775.359 ms - 665 image frames downloaded (15.888 MB) downloaded in 253 ms (502.872 Mbps)
2028.120 ms - 766 image frames downloaded (17.207 MB) downloaded in 255 ms (540.111 Mbps)
2282.991 ms - 881 image frames downloaded (19.737 MB) downloaded in 253 ms (625.068 Mbps)
2535.603 ms - 978 image frames downloaded (16.636 MB) downloaded in 250 ms (531.628 Mbps)
2785.942 ms - 1084 image frames downloaded (18.149 MB) downloaded in 254 ms (572.182 Mbps)
3039.695 ms - 1205 image frames downloaded (20.649 MB) downloaded in 252 ms (655.683 Mbps)
3291.632 ms - 1319 image frames downloaded (19.513 MB) downloaded in 254 ms (614.131 Mbps)
3545.821 ms - 1448 image frames downloaded (21.965 MB) downloaded in 255 ms (690.128 Mbps)
3800.436 ms - 1565 image frames downloaded (19.963 MB) downloaded in 255 ms (626.233 Mbps)
4055.459 ms - 1705 image frames downloaded (23.947 MB) downloaded in 255 ms (751.511 Mbps)
4310.381 ms - 1833 image frames downloaded (21.931 MB) downloaded in 252 ms (695.790 Mbps)
4562.540 ms - 1975 image frames downloaded (24.294 MB) downloaded in 255 ms (762.656 Mbps)
4817.376 ms - 2105 image frames downloaded (22.262 MB) downloaded in 195 ms (912.925 Mbps)
5012.461 ms - 2253 image frames downloaded (25.339 MB) downloaded in 251 ms (808.404 Mbps)
5263.214 ms - 2395 image frames downloaded (24.357 MB) downloaded in 256 ms (760.041 Mbps)
5519.589 ms - 2464 image frames downloaded (11.791 MB) downloaded in 252 ms (374.671 Mbps)
2464 Image Frames Downloaded (421.000 MB compressed)  in 5771 ms (583.572 Mbps)
```

## Performance Tuning

You can achieve very high download rates (saturate a 1Gbps residential internet connection, > 5Gbps
from an EC2 instance) with this library. They key is to take advantage multithreading and HTTP/2 request multiplexing.
The actual download performance varies based on bandwidth and cpu power.  Latency only impacts the time to first image
but does not impact aggregate bandwidth with appropriate concurrency settings.  To tune your download performance,
adjust each of the following settings in order:

1. Number of concurrent requests per connection.
2. Number of connections per thread.
3. Number of download threads.

The default values for each of these in the CLI is relatively low.  Increase the setting for each of the above 
until no further benefit is achieved, then go to the next setting.  For example, if increasing the number of concurrent requests does not yield any further 
speed benefit, start increasing connections per thread. Once connections per thread yields no benefit, try increasing 
the number of download threads.  At some point you will either saturate your bandwidth or CPU in which case no further 
performance gains will be possible.

NOTE - As of Nov 8, 2023, performance does not scale up beyond ~20 concurrent requests/connection and connections
are dropped if the number is too high.  We recommend staying below 20 concurrent requests and increasing the
number of connections and threads accordingly.  Higher numbers of concurrent requests/connection may be 
possible in the future.

HTJ2K decoding is extremely fast and the default of 10 decode threads should generally keep up until download
rates exceed 4 Gbps and large datasets (e.g. > 1GB uncompressed size)

## TODO

-   Add more error handling
-   Add more logging
-   Add support for verifying the ImageFrame CRC checksum
-   Add support for decoding with Kakadu library
-   Add support for getting aws credentials in other ways (e.g. ~/.aws/credentials, STS)?
-   Add support for generating Nifti volumes as an output format?
-   Consider switching from polling to events?
-   Consider configuring libcurl to use shared ssl keys?
-   Explore ways to presize the decode buffer size smarter (currently hard coded to 256k - perhaps Content-Size HTTP Header?)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
