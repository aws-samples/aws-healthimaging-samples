// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Required to load HealthLake Imaging service model
const AWS = require('aws-sdk/lib/core');
const Service = AWS.Service;
const apiLoader = AWS.apiLoader;

/** Set up HealthLake Imaging while the official SDK isn't available
 * If a new service model JSON becomes avaialble, either
 *  1. replace the existing JSON file
 *  2. put the new JSON into the service-models directory and update the path below
 */
apiLoader.services['medical-imaging'] = {};
AWS.MedicalImaging = Service.defineService('medical-imaging', ['2023-03-30']);
Object.defineProperty(apiLoader.services['medical-imaging'], '2023-03-30', {
    get: function get() {
        let model = require('./service-models/medical-imaging-model-v3.json');
        model.paginators = {};
        model.waiters = {};
        return model;
    },
    enumerable: true,
    configurable: true,
});

module.exports = AWS.MedicalImaging;
