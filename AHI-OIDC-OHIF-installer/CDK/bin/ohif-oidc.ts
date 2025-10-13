#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OhifOidcStack } from '../lib/ohif-oidc-stack';

const app = new cdk.App();

// Get configuration from context or environment
const region = app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION || 'us-east-1';
const account = app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT;

// User-configurable stack name - modify this to change the stack name
const userStackName = 'ahi-ohif-oidc';
const stackName = userStackName.toLowerCase();

new OhifOidcStack(app, stackName, {
  env: {
    account: account,
    region: region,
  },
  description: 'OHIF Medical Imaging Viewer with OIDC Authentication using AWS HealthImaging',
  tags: {
    Project: 'OHIF-OIDC',
    Environment: 'Production',
    ManagedBy: 'CDK'
  }
});
