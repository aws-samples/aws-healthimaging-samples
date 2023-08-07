// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Types
import { HealthImagingRegions, AuthMode, ContainerArchitecture, AlbDomain, CfCustomDomain } from './config.types';

export type AppConfig = {
    AHI_REGION: HealthImagingRegions;
    AUTH_MODE: AuthMode;
    COGNITO_USER_POOL_ID: string;
    COGNITO_CLIENT_ID: string;
    ALB_DOMAIN: AlbDomain;
    CF_CUSTOM_DOMAIN: CfCustomDomain;
    CF_CACHE_HEADERS: string[];
    PROXY_LOG_LEVEL: string;
    CONTAINER_ARCHITECTURE: ContainerArchitecture;
};

/**
 * @description (required) The AWS region in which the AWS Health APIs are to be used.
 * @default 'us-east-1'
 * @type {HealthImagingRegions}
 */
export const AHI_REGION: HealthImagingRegions = 'us-east-1';

/**
 * @description (required) The authentication to use with CloudFront and the proxy container
 * @default 'cognito_jwt'
 * @type {AuthMode}
 */
export const AUTH_MODE: AuthMode = 'cognito_jwt';

/**
 * @description The Amazon Cognito User Pool ID to use with cognito_jwt auth.
 * @default ''
 * @type {string}
 */
export const COGNITO_USER_POOL_ID: string = '';

/**
 * @description The Amazon Cognito App ClientID to use with cognito_jwt auth
 * @default ''
 * @type {string}
 */
export const COGNITO_CLIENT_ID: string = '';

/**
 * @description (required) Application Load Balancer properties.
 * @property {string} domainHostname The hostname of the ALB (in front of the proxy). You must create a CNAME pointing
 *                                   this hostname to the ALB's DNS name. This is set as the origin for CloudFront.
 *                                   To use insecured HTTP mode for the ALB, set domainHostName to 'NONE'. Note that in this mode,
 *                                   traffic between CloudFront to the ALB is NOT encrypted.
 * @property {string} acmArn         The AWS Certificate Manager certificate ARN to use with the ALB (in front of the proxy).
 *                                   To use insecured HTTP mode for the ALB, set acmArn to the below:
 *                                   I understand encryption in transit is disabled between CloudFront to the ALB
 * @default { domainHostname: '', acmArn: '' }
 */
export const ALB_DOMAIN: AlbDomain = {
    domainHostname: '',
    acmArn: '',
};

/**
 * @description CloudFront custom CNAME
 * @property {string[]} cfDomains       CloudFront alternative CNAMEs
 * @property {string} cfCertificateArn  ACM certificate ARN for the domains above
 * @default { cfDomains: [], cfCertificateArn: '' }
 */
export const CF_CUSTOM_DOMAIN: CfCustomDomain = {
    cfDomains: [],
    cfCertificateArn: '',
};

/**
 * @description CloudFront cache header list. By default, the authorization header is cached
 *              This means metadata, image set data, and image frame data are cached per JWT
 *              If you remove this header, then all users who pass the JWT check will have access to this data
 *              This bypasses possible IAM auth
 * @default 'authorization'
 * @type {string}
 */
export const CF_CACHE_HEADERS: string[] = ['authorization'];

/**
 * @description Log level for the AHI regional proxy container. If blank, container defaults to 'warn'
 * @default ''
 * @type {string}
 */
export const PROXY_LOG_LEVEL: string = '';

/**
 * @description The architecture of the container. By default this is x86_64, but can be overriden to arm64.
 * @default 'x86_64'
 * @type {string}
 */
export const CONTAINER_ARCHITECTURE: ContainerArchitecture = 'x86_64';
