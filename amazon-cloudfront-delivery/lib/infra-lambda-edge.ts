// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// CDK
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

// Services
import * as ssm from 'aws-cdk-lib/aws-ssm';

// Custom constructs
import { EdgeFunctionJs } from './constructs/lambda-edge';

// Types
import { AuthMode } from '../config.types';

type LambdaEdgeProps = {
    authMode: AuthMode;
    cognitoUserPoolId?: string;
    cognitoClientId?: string;
    ssmAuthorizerFnEdgeArnName: string;
    cdkStackProps?: cdk.StackProps;
};

export class LambdaEdge extends cdk.Stack {
    constructor(scope: Construct, id: string, props: LambdaEdgeProps) {
        super(scope, id, props.cdkStackProps);

        // Update placeholders in authorizer Lambda function
        const findReplaceCmds = [
            `export sed_dir=$(mktemp -d)`,
            `sed 's/COGNITO_USER_POOL_ID_PLACEHOLDER/${props.cognitoUserPoolId}/g' /asset-output/index.js > $sed_dir/index.js`,
            `sed 's/COGNITO_CLIENT_ID_PLACEHOLDER/${props.cognitoClientId}/g' $sed_dir/index.js > /asset-output/index.js`,
        ];
        // If AUTH_MODE is not set, update authorizer AUTH_MODE to false
        if (props.authMode === 'none') {
            findReplaceCmds.push(`sed -i 's/AUTH_MODE = true/AUTH_MODE = false/g' /asset-output/index.js`);
        }

        /**
         * Viewer request Lambda@Edge authorizer function
         */
        const authorizerEdgeFn = new EdgeFunctionJs(this, 'authorizer', {
            handler: 'index.handler',
            codePath: './lambda/edge_authorizer',
            additionalBuildCmds: findReplaceCmds,
        });

        /**
         * Create an SSM string parameter in us-east-1 with the Lambda edge ARN (contains the verison)
         * This is used by CloudFront in another stack as the viewer request
         */
        new ssm.StringParameter(this, 'ssm-authorizer-fn-edge-arn', {
            parameterName: props.ssmAuthorizerFnEdgeArnName,
            stringValue: authorizerEdgeFn.fn.edgeArn,
            description: 'Amazon CloudFront Lambda@Edge authorizer function for AWS HealthImaging',
        });
    }
}
