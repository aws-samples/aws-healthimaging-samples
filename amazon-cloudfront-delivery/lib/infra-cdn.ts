// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// CDK
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

// Services
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
    AllowedMethods,
    BehaviorOptions,
    CacheCookieBehavior,
    CacheHeaderBehavior,
    CachePolicy,
    CacheQueryStringBehavior,
    Distribution,
    EdgeLambda,
    LambdaEdgeEventType,
    OriginRequestCookieBehavior,
    OriginRequestHeaderBehavior,
    OriginRequestPolicy,
    OriginRequestQueryStringBehavior,
    OriginProtocolPolicy,
    OriginSslPolicy,
    PriceClass,
    SecurityPolicyProtocol,
    ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Version } from 'aws-cdk-lib/aws-lambda';
import { BlockPublicAccess, Bucket, BucketEncryption, ObjectOwnership, StorageClass } from 'aws-cdk-lib/aws-s3';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

// Utils
import { getAlbProtocol } from './helpers/albProtocol';

// Types
import { AlbDomain, AuthMode, CfCustomDomain } from '../config.types';

type CdnProps = {
    authMode: AuthMode;
    albDomain: AlbDomain;
    cfToAlbSecretName: string;
    ssmAuthorizerFnEdgeArnName: string;
    ssmAlbHttpDnsName: string;
    cfCustomDomain: CfCustomDomain;
    cfCacheHeaders: string[];
    cdkStackProps?: StackProps;
};

export class Cdn extends Stack {
    constructor(scope: Construct, id: string, props: CdnProps) {
        super(scope, id, props.cdkStackProps);

        const albUseHttp = getAlbProtocol(props.albDomain) === 'http';

        // CloudFront Lambda@Edge object
        let cfEdgeLambda: EdgeLambda[] = [];
        if (props.authMode === 'cognito_jwt') {
            // Get authorizer Lambda edge function ARN from SSM
            const authorizerEdgeFnArn = StringParameter.valueForStringParameter(this, props.ssmAuthorizerFnEdgeArnName);
            cfEdgeLambda.push({
                eventType: LambdaEdgeEventType.VIEWER_REQUEST,
                includeBody: false,
                functionVersion: Version.fromVersionArn(this, 'authorizer-version', authorizerEdgeFnArn),
            });
        }

        /**
         * S3 bucket for CloudFront access logs. CF requires bucket ACLs to be enabled
         */
        const accessLogsBucket = new Bucket(this, 'cf-access-logs-bucket', {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            encryption: BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            lifecycleRules: [
                {
                    transitions: [
                        {
                            storageClass: StorageClass.INTELLIGENT_TIERING,
                            transitionAfter: Duration.days(0),
                        },
                    ],
                },
            ],
            objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
            removalPolicy: RemovalPolicy.RETAIN,
        });

        /**
         * CloudFront cache policy. Use query string as cache key.
         */
        const cachePolicy = new CachePolicy(this, 'cf-cache-policy', {
            cookieBehavior: CacheCookieBehavior.none(),
            headerBehavior:
                props.cfCacheHeaders.length > 0
                    ? CacheHeaderBehavior.allowList(props.cfCacheHeaders.join(','))
                    : CacheHeaderBehavior.none(),
            queryStringBehavior: CacheQueryStringBehavior.all(),
        });

        /**
         * CloudFront origin request policy. This is the same as CORS-S3Origin currently
         */
        const originRequestPolicy = new OriginRequestPolicy(this, 'cf-origin-request-policy', {
            cookieBehavior: OriginRequestCookieBehavior.none(),
            queryStringBehavior: OriginRequestQueryStringBehavior.all(),
            headerBehavior: OriginRequestHeaderBehavior.allowList(
                'Origin',
                'Access-Control-Request-Headers',
                'Access-Control-Request-Method'
            ),
        });

        /**
         * Get unique header string from Secrets Manager. The ALB requires this to forward the request to Fargate
         * This secret is created in the infra-regional-proxy stack
         */
        const cfToAlbSecret = Secret.fromSecretNameV2(this, 'cf-to-alb-secret', props.cfToAlbSecretName);
        const cfToAlbSecretString = cfToAlbSecret.secretValue.unsafeUnwrap();

        /**
         * CloudFront Origin
         */
        let cfOriginProps = {};
        let cfOriginDomain = '';
        if (albUseHttp) {
            cfOriginProps = {
                protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
            };
            // Get ALB HTTP DNS name from SSM
            const albHttpDnsName = StringParameter.valueForStringParameter(this, props.ssmAlbHttpDnsName);
            cfOriginDomain = albHttpDnsName;
        } else {
            cfOriginProps = {
                originSslProtocols: [OriginSslPolicy.TLS_V1_2],
                protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
            };
            cfOriginDomain = props.albDomain.domainHostname;
        }
        const cfOrigin = new HttpOrigin(cfOriginDomain, {
            customHeaders: {
                'X-Custom-Header': cfToAlbSecretString,
            },
            ...cfOriginProps,
        });

        /**
         * CloudFront distribution default behavior
         */
        const cfDefaultBehavior: BehaviorOptions = {
            origin: cfOrigin,
            allowedMethods: AllowedMethods.ALLOW_ALL,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cachePolicy,
            originRequestPolicy: originRequestPolicy,
            edgeLambdas: cfEdgeLambda,
        };

        /**
         * Optional custom CNAME for CloudFront distribution
         */
        let cfCnameOpts = {};
        if (props.cfCustomDomain.cfDomains?.length > 0) {
            const cfCnameCertificate = Certificate.fromCertificateArn(
                this,
                'cf-cname-certificate',
                props.cfCustomDomain.cfCertificateArn
            );
            cfCnameOpts = {
                domainNames: props.cfCustomDomain.cfDomains,
                certificate: cfCnameCertificate,
                securityPolicy: SecurityPolicyProtocol.TLS_V1_2_2021,
            };
        }

        /**
         * CloudFront distribution
         */
        const cfDistribution = new Distribution(this, 'cf', {
            comment: 'Amazon CloudFront distribution for AWS HealthImaging',
            // As of Dec 2022, the minimium security policy is set to TLSv1 if using the
            //   default *.cloudfront.net viewer certificiate, regardless of minimumProtocolVersion
            // This setting applies when using CUSTOM_CNAME and an AWS Certificate Manager certificate
            minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
            priceClass: PriceClass.PRICE_CLASS_ALL,
            enableLogging: true,
            logBucket: accessLogsBucket,
            logFilePrefix: 'cloudfront',
            defaultBehavior: cfDefaultBehavior,
            ...cfCnameOpts,
        });

        new CfnOutput(this, 'cf-url', {
            value: `https://${cfDistribution.distributionDomainName}`,
            description: 'The URL of the Amazon CloudFront distribution',
            exportName: 'cf-url',
        });
    }
}
