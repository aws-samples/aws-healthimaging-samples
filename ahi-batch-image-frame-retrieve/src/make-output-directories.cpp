#include "ahi-retrieve/make-output-directories.h"
#include "ahi-retrieve/string-format.h"
#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>

void AHIRetrieve::makeOutputDirectories(const std::string &datastoreId, const std::string &imageSetId)
{
    mkdir(datastoreId.c_str(), S_IRWXU);
    std::string imageSetPath = AHIRetrieve::stringFormat("%s/%s", datastoreId.c_str(), imageSetId.c_str());
    mkdir(imageSetPath.c_str(), S_IRWXU);
}
