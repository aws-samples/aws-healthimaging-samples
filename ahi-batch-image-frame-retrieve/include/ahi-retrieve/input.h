//  To parse this JSON data, first install
//
//      json.hpp  https://github.com/nlohmann/json
//
//  Then include this file, and then do
//
//     Input data = nlohmann::json::parse(jsonString);

#pragma once

#include "json.hpp"

#include <optional>
#include <stdexcept>
#include <regex>

namespace quicktype {
    using nlohmann::json;

    #ifndef NLOHMANN_UNTYPED_quicktype_HELPER
    #define NLOHMANN_UNTYPED_quicktype_HELPER
    inline json get_untyped(const json & j, const char * property) {
        if (j.find(property) != j.end()) {
            return j.at(property).get<json>();
        }
        return json();
    }

    inline json get_untyped(const json & j, std::string property) {
        return get_untyped(j, property.data());
    }
    #endif

    class ImageFrame {
        public:
        ImageFrame() = default;
        virtual ~ImageFrame() = default;

        private:
        double frame_size_in_bytes;
        std::string id;

        public:
        const double & get_frame_size_in_bytes() const { return frame_size_in_bytes; }
        double & get_mutable_frame_size_in_bytes() { return frame_size_in_bytes; }
        void set_frame_size_in_bytes(const double & value) { this->frame_size_in_bytes = value; }

        const std::string & get_id() const { return id; }
        std::string & get_mutable_id() { return id; }
        void set_id(const std::string & value) { this->id = value; }
    };

    class Instance {
        public:
        Instance() = default;
        virtual ~Instance() = default;

        private:
        std::vector<ImageFrame> image_frames;

        public:
        const std::vector<ImageFrame> & get_image_frames() const { return image_frames; }
        std::vector<ImageFrame> & get_mutable_image_frames() { return image_frames; }
        void set_image_frames(const std::vector<ImageFrame> & value) { this->image_frames = value; }
    };

    class Series {
        public:
        Series() = default;
        virtual ~Series() = default;

        private:
        std::map<std::string, Instance> instances;

        public:
        const std::map<std::string, Instance> & get_instances() const { return instances; }
        std::map<std::string, Instance> & get_mutable_instances() { return instances; }
        void set_instances(const std::map<std::string, Instance> & value) { this->instances = value; }
    };

    class Study {
        public:
        Study() = default;
        virtual ~Study() = default;

        private:
        std::map<std::string, Series> series;

        public:
        const std::map<std::string, Series> & get_series() const { return series; }
        std::map<std::string, Series> & get_mutable_series() { return series; }
        void set_series(const std::map<std::string, Series> & value) { this->series = value; }
    };

    class Input {
        public:
        Input() = default;
        virtual ~Input() = default;

        private:
        std::string datastore_id;
        std::string image_set_id;
        Study study;

        public:
        const std::string & get_datastore_id() const { return datastore_id; }
        std::string & get_mutable_datastore_id() { return datastore_id; }
        void set_datastore_id(const std::string & value) { this->datastore_id = value; }

        const std::string & get_image_set_id() const { return image_set_id; }
        std::string & get_mutable_image_set_id() { return image_set_id; }
        void set_image_set_id(const std::string & value) { this->image_set_id = value; }

        const Study & get_study() const { return study; }
        Study & get_mutable_study() { return study; }
        void set_study(const Study & value) { this->study = value; }
    };
}

namespace quicktype {
    void from_json(const json & j, ImageFrame & x);
    void to_json(json & j, const ImageFrame & x);

    void from_json(const json & j, Instance & x);
    void to_json(json & j, const Instance & x);

    void from_json(const json & j, Series & x);
    void to_json(json & j, const Series & x);

    void from_json(const json & j, Study & x);
    void to_json(json & j, const Study & x);

    void from_json(const json & j, Input & x);
    void to_json(json & j, const Input & x);

    inline void from_json(const json & j, ImageFrame& x) {
        x.set_frame_size_in_bytes(j.at("FrameSizeInBytes").get<double>());
        x.set_id(j.at("ID").get<std::string>());
    }

    inline void to_json(json & j, const ImageFrame & x) {
        j = json::object();
        j["FrameSizeInBytes"] = x.get_frame_size_in_bytes();
        j["ID"] = x.get_id();
    }

    inline void from_json(const json & j, Instance& x) {
        x.set_image_frames(j.at("ImageFrames").get<std::vector<ImageFrame>>());
    }

    inline void to_json(json & j, const Instance & x) {
        j = json::object();
        j["ImageFrames"] = x.get_image_frames();
    }

    inline void from_json(const json & j, Series& x) {
        x.set_instances(j.at("Instances").get<std::map<std::string, Instance>>());
    }

    inline void to_json(json & j, const Series & x) {
        j = json::object();
        j["Instances"] = x.get_instances();
    }

    inline void from_json(const json & j, Study& x) {
        x.set_series(j.at("Series").get<std::map<std::string, Series>>());
    }

    inline void to_json(json & j, const Study & x) {
        j = json::object();
        j["Series"] = x.get_series();
    }

    inline void from_json(const json & j, Input& x) {
        x.set_datastore_id(j.at("DatastoreID").get<std::string>());
        x.set_image_set_id(j.at("ImageSetID").get<std::string>());
        x.set_study(j.at("Study").get<Study>());
    }

    inline void to_json(json & j, const Input & x) {
        j = json::object();
        j["DatastoreID"] = x.get_datastore_id();
        j["ImageSetID"] = x.get_image_set_id();
        j["Study"] = x.get_study();
    }
}
