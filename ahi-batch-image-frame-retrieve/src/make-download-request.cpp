#include "ahi-retrieve/input.h"
#include "ahi-retrieve/ahi-retrieve.h"
#include "ahi-retrieve/string-format.h"
#include "ahi-retrieve/image-frame-request.h"

using namespace AHIRetrieve;

static size_t requestCounter = 1;

std::vector<ImageFrameRequest> makeDownloadRequest(const AHIImageFrameRetrieveArgs &args, const quicktype::Input &input)
{
    std::vector<ImageFrameRequest> requests;

    auto series = input.get_study().get_series();
    for (auto i = series.begin(); i != series.end(); i++)
    {
        auto s = i->second;
        auto instances = i->second.get_instances();
        for (auto j = instances.begin(); j != instances.end(); j++)
        {
            auto imageFrames = j->second.get_image_frames();
            for (auto k = imageFrames.begin(); k != imageFrames.end(); k++)
            {
                requests.push_back(ImageFrameRequest{
                    .datastoreId = input.get_datastore_id(),
                    .imageSetId = input.get_image_set_id(),
                    .imageFrameId = k->get_id(),
                    .bytes = std::make_shared<std::vector<unsigned char>>(k->get_frame_size_in_bytes())});
            }
        }
    }

    return requests;
}
