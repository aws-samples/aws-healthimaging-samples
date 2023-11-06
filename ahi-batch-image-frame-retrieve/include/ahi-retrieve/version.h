#pragma once
#include <string>
#include <vector>

namespace AHIRetrieve
{

    std::string getVersion();

    std::vector<std::pair<std::string, std::string>> getDependencyVersions();

} // Namespae AHIRetrieve
