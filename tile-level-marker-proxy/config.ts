// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/** These parameters are used for the CDK deployment and container environment variables
 * See README.md for more information.
 */

type NullableString = string | undefined | null;

// @Required:     Yes
// @Usage:        Deploy region
// @Description:  AWS region where this stack is deployed
const DEPLOY_REGION: string = 'us-east-1';

// @Required:     Yes
// @Usage:        CDK deployment
// @Description:  AWS Certificate Manager SSL certificate ARN
const ACM_ARN: string = '';

// @Required:     No
// @Usage:        Container environment variable
// @Description:  Authentication type. See README
const AUTH_MODE: NullableString = 'cognito_jwt';

// @Required:     Yes, if using Amazon Cognito JWT auth. See README
// @Usage:        Container environment variable
// @Description:  Amazon Cognito user pool ID, typically formatted "<region>_abcdefghi", i.e. "us-east-1_abcdefghi"
const COGNITO_USER_POOL_ID: NullableString = '';

// @Required:     No
// @Usage:        Container environment variable
// @Description:  Amazon Cognito client ID for additional verification
const COGNITO_CLIENT_ID: NullableString = null;

// @Required:     No
// @Usage:        CDK deployment
// @Description:  Whether to enable Amazon Elasticache for memcached
const ENABLE_ELASTICACHE: boolean = true;

// @Required:     No
// @Usage:        AHLI service region
// @Description:  Amazon HealthLake Imaging region, i.e. healthlake-imaging.<region>.amazonaws.com
const AHLI_REGION: NullableString = 'us-east-1';

// @Required:     No
// @Usage:        AHLI endpoint
// @Description:  Amazon HealthLake Imaging endpoint without the protocol (https://). Overrides AHLI_REGION
const AHLI_ENDPOINT: NullableString = '';

export {
    DEPLOY_REGION,
    ACM_ARN,
    AUTH_MODE,
    COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID,
    ENABLE_ELASTICACHE,
    AHLI_REGION,
    AHLI_ENDPOINT
};
