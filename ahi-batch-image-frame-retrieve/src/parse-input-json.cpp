#include "ahi-retrieve/input.h"

quicktype::Input parseInputJSON(const std::string &json)
{
    auto data = nlohmann::json::parse(json);
    quicktype::Input input;
    quicktype::from_json(data, input);
    return input;
}
