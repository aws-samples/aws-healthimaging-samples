#include <string>
#include <fstream>
#include <streambuf>
#include "ahi-retrieve/read-file-sync.h"
#include "ahi-retrieve/logger.h"
#include "ahi-retrieve/trace.h"

using namespace AHIRetrieve;

static std::string error;

void AHIRetrieve::readFileSync(const char *filePath, std::string &str)
{
    AHIRetrieve::log(DEBUG, "readFileSync %s", filePath);
    str.clear();

    std::ifstream t(filePath);
    if (t.fail())
    {
        error = "failed to open file ";
        error += filePath;
        throw(error.c_str());
    }

    t.seekg(0, std::ios::end);
    str.reserve(t.tellg());
    t.seekg(0, std::ios::beg);

    str.assign((std::istreambuf_iterator<char>(t)),
               std::istreambuf_iterator<char>());
}