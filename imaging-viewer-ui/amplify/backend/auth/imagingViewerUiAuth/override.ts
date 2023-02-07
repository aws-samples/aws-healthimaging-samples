import { AmplifyAuthCognitoStackTemplate } from '@aws-amplify/cli-extensibility-helper';
import * as cognito from '@aws-cdk/aws-cognito';

/**
 * Override Amplify-generated Cognito resources
 * https://docs.amplify.aws/cli/auth/override/
 * Set user pool client token validity to 60 minutes
 */
export function override(resources: AmplifyAuthCognitoStackTemplate) {
    const minutesValidityUnit: cognito.CfnUserPoolClient.TokenValidityUnitsProperty = {
        accessToken: 'minutes',
        idToken: 'minutes',
        refreshToken: 'minutes',
    };

    resources.userPoolClient.refreshTokenValidity = 60;
    resources.userPoolClient.accessTokenValidity = 60;
    resources.userPoolClient.idTokenValidity = 60;
    resources.userPoolClient.tokenValidityUnits = minutesValidityUnit;

    resources.userPoolClientWeb.refreshTokenValidity = 60;
    resources.userPoolClientWeb.accessTokenValidity = 60;
    resources.userPoolClientWeb.idTokenValidity = 60;
    resources.userPoolClientWeb.tokenValidityUnits = minutesValidityUnit;
}
