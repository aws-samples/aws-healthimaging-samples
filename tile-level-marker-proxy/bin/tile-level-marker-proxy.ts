#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import 'source-map-support/register';
import { App, Aspects } from 'aws-cdk-lib';
import { TileLevelMarkerProxyStack } from '../lib/tile-level-marker-proxy-stack';
import { AwsSolutionsChecks } from 'cdk-nag';

import { DEPLOY_REGION } from '../config';

const app = new App();
new TileLevelMarkerProxyStack(app, 'TileLevelMarkerProxyStack', {
    env: { region: DEPLOY_REGION || 'us-east-1' },
});

// Optionally remove the below line to not evaluate CDK-Nag checks of this CDK application
Aspects.of(app).add(new AwsSolutionsChecks());
