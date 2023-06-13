// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/** These parameters are used for the CDK deployment and container environment variables
 * See README.md for more information.
 */

type NullableString = string | undefined | null;

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
// @Usage:        AHLI service region
// @Description:  Amazon HealthLake Imaging region, i.e. runtime-healthlake-imaging.<region>.amazonaws.com
const AHLI_REGION: NullableString = 'us-east-1';

// @Required:     No
// @Usage:        AHLI endpoint
// @Description:  Amazon HealthLake Imaging endpoint without the protocol (https://). Overrides AHLI_REGION
const AHLI_ENDPOINT: NullableString = '';

export {
    AUTH_MODE,
    COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID,
    AHLI_REGION,
    AHLI_ENDPOINT,
};
