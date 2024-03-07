#include "ahi-retrieve/logger.h"
#include <fcntl.h>
#include <iostream>
#include <fstream>
#include <vector>
#include <stdio.h>
#include <errno.h>
#include <string.h>
#include "ahi-retrieve/write-file-sync.h"

using namespace AHIRetrieve;

void AHIRetrieve::writeFileSync(const char *filePath, const std::vector<unsigned char> &buffer)
{
    std::ofstream fs(filePath, std::ios::out | std::ios::binary | std::ios::trunc);
    fs.write((const char *)buffer.data(), buffer.size());
    fs.close();
}