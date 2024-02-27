#include "ahi-retrieve/make-output-directories.h"
#include "ahi-retrieve/string-format.h"
#ifdef _WINDOWS
#include <io.h>
#else
#include <unistd.h>
#endif
#include <filesystem>
#include <sys/types.h>
#include <sys/stat.h>

void AHIRetrieve::makeOutputDirectories(const std::string &datastoreId, const std::string &imageSetId)
{
    std::filesystem::create_directory(datastoreId.c_str());
    std::string imageSetPath = AHIRetrieve::stringFormat("%s/%s", datastoreId.c_str(), imageSetId.c_str());
    std::filesystem::create_directory(imageSetPath.c_str());
}
