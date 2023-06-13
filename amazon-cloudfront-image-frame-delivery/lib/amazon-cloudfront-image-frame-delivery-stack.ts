// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// CDK
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as cfo from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';

// Custom CDK construct
import { EdgeFunctionJs } from './lambda-edge';

// CDK-Nag
import { suppressNag } from './nag-suppressions';

import {
    AUTH_MODE,
    COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID,
    AHLI_REGION,
    AHLI_ENDPOINT,
} from '../config';

/** Amazon HealthLake Imaging URL
 * Use $AHLI_ENDPOINT if set, otherwise use the standard URL with $AHLI_REGION
 * If neither is defined, use us-east-1
 */
const AHLI_DOMAIN = AHLI_ENDPOINT
    ? AHLI_ENDPOINT
    : AHLI_REGION
    ? `runtime-healthlake-imaging.${AHLI_REGION}.amazonaws.com`
    : 'runtime-healthlake-imaging.us-east-1.amazonaws.com';

/** If AUTH_MODE is set (assume cognito_jwt),
 * COGNITO_USER_POOL_ID must be a string between 1 and 55 characters. See below for format.
 * COGNITO_CLIENT_ID must be between 1 and 128 characters. See below for format.
 *    https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UserPoolClientDescription.html
 */
const COGNITO_USER_POOL_ID_PATTERN = /[\w-]+_[0-9a-zA-Z]+/;
if (AUTH_MODE) {
    if (!COGNITO_USER_POOL_ID || typeof COGNITO_USER_POOL_ID !== 'string') {
        throw new Error(
            'If AUTH_MODE is set, COGNITO_USER_POOL_ID must be defined as a string.'
        );
    } else if (!COGNITO_USER_POOL_ID_PATTERN.test(COGNITO_USER_POOL_ID)) {
        throw new Error(
            'COGNITO_USER_POOL_ID must be in the format [w-]+_[0-9a-zA-Z]+.'
        );
    } else if (
        COGNITO_USER_POOL_ID.length < 1 ||
        COGNITO_USER_POOL_ID.length > 55
    ) {
        throw new Error(
            'COGNITO_USER_POOL_ID must between 1 and 55 characters.'
        );
    }

    if (COGNITO_CLIENT_ID) {
        if (COGNITO_CLIENT_ID.length < 1 || COGNITO_CLIENT_ID.length > 128) {
            throw new Error(
                'COGNITO_CLIENT_ID must be between 1 and 128 characters.'
            );
        }
    }
}

export class AmazonCloudFrontImageFrameDeliveryStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Enforce region deployment for L@E functions
        if (props?.env?.region !== 'us-east-1') {
            throw new Error('Edge stack must be deployed in us-east-1!');
        }

        // Policy that permits access to medical-imaging:GetFrames
        const signerIamPolicy = new iam.PolicyStatement({
            actions: ['medical-imaging:GetImageFrame'],
            resources: ['*'],
        });

        // Signer Lambda@Edge function
        const signerEdgeFn = new EdgeFunctionJs(this, 'signer', {
            handler: 'index.handler',
            codePath: './lambda/edge_signer',
            inlinePolicy: signerIamPolicy,
        });

        // Update placeholders in authorizer Lambda function
        const findReplaceCmds = [
            `sed -i 's/COGNITO_USER_POOL_ID_PLACEHOLDER/${COGNITO_USER_POOL_ID}/g' /asset-output/index.js`,
            `sed -i 's/COGNITO_CLIENT_ID_PLACEHOLDER/${COGNITO_CLIENT_ID}/g' /asset-output/index.js`,
        ];
        // If AUTH_MODE is not set, update authorizer AUTH_MODE to false
        if (!AUTH_MODE) {
            findReplaceCmds.push(
                `sed -i 's/AUTH_MODE = true/AUTH_MODE = false/g' /asset-output/index.js`
            );
        }

        // Authorizer Lambda@Edge function - deploy this regardless of AUTH_MODE
        const authorizerEdgeFn = new EdgeFunctionJs(this, 'authorizer', {
            handler: 'index.handler',
            codePath: './lambda/edge_authorizer',
            additionalBuildCmds: findReplaceCmds,
        });

        // CloudFront Lambda@Edge object
        let cfEdgeLambdas: cf.EdgeLambda[] = [
            {
                eventType: cf.LambdaEdgeEventType.VIEWER_REQUEST,
                includeBody: false,
                functionVersion: lambda.Version.fromVersionArn(
                    this,
                    'authorizerVersion',
                    authorizerEdgeFn.fn.edgeArn
                ),
            },
            {
                eventType: cf.LambdaEdgeEventType.ORIGIN_REQUEST,
                includeBody: false,
                functionVersion: lambda.Version.fromVersionArn(
                    this,
                    'signerVersion',
                    signerEdgeFn.fn.edgeArn
                ),
            },
        ];

        // S3 bucket for CloudFront access logs. CF requires bucket ACLs to be enabled
        const accessLogsBucket = new s3.Bucket(this, 'AccessLogsBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            lifecycleRules: [
                {
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INTELLIGENT_TIERING,
                            transitionAfter: cdk.Duration.days(0),
                        },
                    ],
                },
            ],
            objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // Checkov
        const accessLogsBucketCfn = accessLogsBucket.node
            .defaultChild as s3.CfnBucket;
        accessLogsBucketCfn.cfnOptions.metadata = {
            checkov: {
                skip: [
                    {
                        id: 'CKV_AWS_18',
                        comment:
                            'CloudFront access logs access logging not needed in sample code.',
                    },
                    {
                        id: 'CKV_AWS_21',
                        comment:
                            'CloudFront access logs versioning not needed in sample code.',
                    },
                ],
            },
        };

        // CloudFront Distribution
        const cfDistribution = new cf.Distribution(this, 'cf', {
            comment:
                'Amazon CloudFront distribution for Amazon HealthLake Imaging image frames',
            // As of Dec 2022, the minimium security policy is set to TLSv1 if using the
            //   default *.cloudfront.net viewer certificiate, regardless of minimumProtocolVersion
            minimumProtocolVersion: cf.SecurityPolicyProtocol.TLS_V1_2_2021,
            priceClass: cf.PriceClass.PRICE_CLASS_100,
            enableLogging: true,
            logBucket: accessLogsBucket,
            logFilePrefix: 'cloudfront',
            defaultBehavior: {
                origin: new cfo.HttpOrigin(AHLI_DOMAIN, {
                    originSslProtocols: [cf.OriginSslPolicy.TLS_V1_2],
                    protocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY,
                }),
                allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
                viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
                originRequestPolicy: cf.OriginRequestPolicy.CORS_CUSTOM_ORIGIN,
                edgeLambdas: cfEdgeLambdas,
            },
        });

        // Checkov
        const cfDistributionCfn = cfDistribution.node
            .defaultChild as cf.CfnDistribution;
        cfDistributionCfn.cfnOptions.metadata = {
            checkov: {
                skip: [
                    {
                        id: 'CKV_AWS_68',
                        comment:
                            'WAF not needed for sample code. Instructions for enabling WAF for CloudFront is provided in the README',
                    },
                    {
                        id: 'CKV_AWS_174',
                        comment:
                            'Distribution uses default CloudFront certificate whichwhich cannot enforce TLS v1.2.',
                    },
                ],
            },
        };

        new cdk.CfnOutput(this, 'cf-url', {
            value: `https://${cfDistribution.distributionDomainName}`,
            description: 'The URL of the Amazon CloudFront distribution',
            exportName: 'cfUrl',
        });

        // Suppress CDK-Nag rules
        suppressNag(
            signerEdgeFn,
            authorizerEdgeFn,
            accessLogsBucket,
            cfDistribution
        );
    }
}
