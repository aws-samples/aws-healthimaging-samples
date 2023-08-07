#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import 'source-map-support/register';
import { App } from 'aws-cdk-lib';

// Stacks
import { RegionalProxy } from '../lib/infra-regional-proxy';
import { LambdaEdge } from '../lib/infra-lambda-edge';
import { Cdn } from '../lib/infra-cdn';

const APP_PREFIX = 'healthimaging-cloudfront-delivery';
const REGIONAL_PROXY_STACK_NAME = `${APP_PREFIX}-regional-proxy`;
const LAMBDA_EDGE_STACK_NAME = `${APP_PREFIX}-lambda-edge`;
const CDN_STACK_NAME = `${APP_PREFIX}-cdn`;

// Named resources
const CF_TO_ALB_SECRET_NAME = `${APP_PREFIX}-cf-to-alb-custom-header`.replace(/-([a-z])/g, function (g) {
    return g[1].toUpperCase();
});
const SSM_AUTHORIZER_FN_EDGE_ARN_NAME = `${APP_PREFIX}-ssm-authorizer-fn-edge-arn`;
const SSM_ALB_HTTP_DNS_NAME = `${APP_PREFIX}-ssm-alb-http-dns-name`;

/**
 * Combine config files. Use configLocal to override global config
 */
import * as configLocal from '../config.local';
import * as configGlobal from '../config';
const config = { ...configGlobal, ...configLocal };

const app = new App();

/**
 * The regional-proxy stack creates:
 *  - VPC in the AHI_REGION region with 2 public and 2 private with internet access subnets
 *  - AWS ECS on AWS Fargate cluster running Node.js proxy application
 *  - Application load balancer in front of the Fargate cluster
 */
const regionalProxyStack = new RegionalProxy(app, REGIONAL_PROXY_STACK_NAME, {
    ahiRegion: config.AHI_REGION,
    albDomain: config.ALB_DOMAIN,
    authMode: config.AUTH_MODE,
    cfToAlbSecretName: CF_TO_ALB_SECRET_NAME,
    cognitoUserPoolId: config.COGNITO_USER_POOL_ID,
    cognitoClientId: config.COGNITO_CLIENT_ID,
    ssmAlbHttpDnsName: SSM_ALB_HTTP_DNS_NAME,
    proxyLogLevel: config.PROXY_LOG_LEVEL,
    containerArchitecture: config.CONTAINER_ARCHITECTURE,
    cdkStackProps: {
        env: { region: config.AHI_REGION },
    },
});

/**
 * The cdn stack creates:
 *  - Amazon CloudFront distribution with:
 *      - Lambda@Edge viewer request from the lambda-edge stack
 */
const cdnStack = new Cdn(app, CDN_STACK_NAME, {
    authMode: config.AUTH_MODE,
    albDomain: config.ALB_DOMAIN,
    cfToAlbSecretName: CF_TO_ALB_SECRET_NAME,
    cfCacheHeaders: config.CF_CACHE_HEADERS,
    ssmAuthorizerFnEdgeArnName: SSM_AUTHORIZER_FN_EDGE_ARN_NAME,
    ssmAlbHttpDnsName: SSM_ALB_HTTP_DNS_NAME,
    cfCustomDomain: config.CF_CUSTOM_DOMAIN,
    cdkStackProps: {
        env: { region: config.AHI_REGION },
    },
});
cdnStack.addDependency(regionalProxyStack);

/**
 * Only deploy this stack if AUTH_MODE is 'cognito_jwt'
 * The lambda-edge stack creates:
 *  - Lambda function in us-east-1
 *  - SSM parameters in us-east-1 with:
 *      - <stack>/Edge-Viewer-Request-Fn-Version-Arn
 */
if (config.AUTH_MODE === 'cognito_jwt') {
    const lambdaEdgeStack = new LambdaEdge(app, LAMBDA_EDGE_STACK_NAME, {
        authMode: config.AUTH_MODE,
        cognitoUserPoolId: config.COGNITO_USER_POOL_ID,
        cognitoClientId: config.COGNITO_CLIENT_ID,
        ssmAuthorizerFnEdgeArnName: SSM_AUTHORIZER_FN_EDGE_ARN_NAME,
        cdkStackProps: {
            env: { region: 'us-east-1' },
        },
    });
    cdnStack.addDependency(lambdaEdgeStack);
}
