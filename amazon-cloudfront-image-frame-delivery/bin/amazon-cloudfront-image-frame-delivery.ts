#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import 'source-map-support/register';
import { App, Aspects } from 'aws-cdk-lib';
import { AmazonCloudFrontImageFrameDeliveryStack } from '../lib/amazon-cloudfront-image-frame-delivery-stack';
import { AwsSolutionsChecks } from 'cdk-nag';

const app = new App();

// Lambda@Edge stack - always deploy to us-east-1 due to L@E requirements
new AmazonCloudFrontImageFrameDeliveryStack(
    app,
    'AmazonCloudFrontImageFrameDelivery',
    {
        env: { region: 'us-east-1' },
    }
);

// Optionally remove the below line to not evaluate CDK-Nag checks of this CDK application
Aspects.of(app).add(new AwsSolutionsChecks());
