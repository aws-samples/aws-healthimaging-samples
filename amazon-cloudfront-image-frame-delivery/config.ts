// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/** These parameters are used for the CDK deployment and container environment variables
 * See README.md for more information.
 */

type AuthMode = null | 'null' | 'cognito_jwt';
type NullableString = string | undefined | null;
type CustomCname = {
    domainNames: string[];
    certificateArn: string;
};

// @Required:     No
// @Usage:        Container environment variable
// @Description:  Authentication type. See README
const AUTH_MODE: AuthMode = null;

// @Required:     No
// @Usage:        CloudFront custom CNAME
// @Description:  Use custom CNAME for CloudFront distribution. Requires a certificate in the us-east-1 region
const CUSTOM_CNAME: CustomCname = {
    domainNames: ['cf.imaging.yno.people.aws.dev'],
    certificateArn:
        'arn:aws:acm:us-east-1:160057935798:certificate/8f8d43be-b6cb-443d-8d9a-124c750628c1',
};

// @Required:     Yes, if using Amazon Cognito JWT auth. See README
// @Usage:        Container environment variable
// @Description:  Amazon Cognito user pool ID, typically formatted "<region>_abcdefghi", i.e. "us-east-1_abcdefghi"
const COGNITO_USER_POOL_ID: NullableString = '';

// @Required:     No
// @Usage:        Container environment variable
// @Description:  Amazon Cognito client ID for additional verification
const COGNITO_CLIENT_ID: NullableString = null;

// @Required:     No
// @Usage:        AHLI service region
// @Description:  AWS HealthImaging region, i.e. runtime-medical-imaging.<region>.amazonaws.com
const AHLI_REGION: NullableString = 'us-east-1';

// @Required:     No
// @Usage:        AHLI endpoint
// @Description:  AWS HealthImaging endpoint without the protocol (https://). Overrides AHLI_REGION
const AHLI_ENDPOINT: NullableString = '';

export {
    AUTH_MODE,
    CUSTOM_CNAME,
    COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID,
    AHLI_REGION,
    AHLI_ENDPOINT,
};
