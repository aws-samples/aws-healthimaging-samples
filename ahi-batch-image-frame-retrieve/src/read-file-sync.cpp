#include <string>
#include <fstream>
#include <streambuf>
#include "ahi-retrieve/read-file-sync.h"

using namespace AHIRetrieve;

void AHIRetrieve::readFileSync(const char *filePath, std::string &str)
{
    str.clear();

    std::ifstream t(filePath);

    t.seekg(0, std::ios::end);
    str.reserve(t.tellg());
    t.seekg(0, std::ios::beg);

    str.assign((std::istreambuf_iterator<char>(t)),
               std::istreambuf_iterator<char>());
}