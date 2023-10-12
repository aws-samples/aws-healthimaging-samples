// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export type HealthImagingRegions =
    | 'us-east-1'
    | 'us-west-2'
    | 'ap-southeast-2'
    | 'eu-west-1';

export type AuthMode = 'none' | 'cognito_jwt';

export type AlbDomain = {
    domainHostname: string;
    acmArn: string;
};

export type CfCustomDomain = {
    cfDomains: string[];
    cfCertificateArn: string;
};

export type ContainerArchitecture = 'x86_64' | 'arm64';
