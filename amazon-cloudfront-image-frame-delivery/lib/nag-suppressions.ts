// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { NagSuppressions } from 'cdk-nag';

import { EdgeFunctionJs } from './lambda-edge';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';

export function suppressNag(
    signerFn: EdgeFunctionJs,
    authorizerFn: EdgeFunctionJs,
    accessLogsBucket: Bucket,
    cfDistribution: Distribution
) {
    NagSuppressions.addResourceSuppressions(
        signerFn,
        [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Controlled by CDK L2 construct.',
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Allow the signer access to all AWS HealthImaging image frames. Steps to tighten this control is listed in the FAQ.',
            },
        ],
        true
    );

    NagSuppressions.addResourceSuppressions(
        authorizerFn,
        [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Controlled by CDK L2 construct.',
            },
        ],
        true
    );

    NagSuppressions.addResourceSuppressions(accessLogsBucket, [
        {
            id: 'AwsSolutions-S1',
            reason: 'CloudFront access logs access logging not needed in sample code.',
        },
    ]);

    NagSuppressions.addResourceSuppressions(
        cfDistribution,
        [
            {
                id: 'AwsSolutions-CFR1',
                reason: 'Geo restriction not needed for sample code.',
            },
            {
                id: 'AwsSolutions-CFR2',
                reason: 'WAF not needed for sample code.',
            },
            {
                id: 'AwsSolutions-CFR4',
                reason: 'Distribution uses default CloudFront certificate which which cannot enforce TLS v1.2.',
            },
        ],
        true
    );
}
