// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * This construct creates a NodeJS 18 Lambda@Edge function
 * It requires Docker to build
 */

import { Construct } from 'constructs';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * @description Lambda@Edge function props
 * @property {string} handler Lambda handler, i.e. index.handler
 * @property {string} codePath path to the code, i.e. ./lambda/edge_signer
 * @property {iam.PolicyStatement} inlinePolicy an inline policy to attach to the Lambda execution policy
 * @property {string[]} additionalBuildCmds additional bash build commands
 */
export interface EdgeFunctionJsProps {
    handler: string;
    codePath: string;
    inlinePolicy?: iam.PolicyStatement;
    additionalBuildCmds?: string[];
}

/**
 * Lambda@Edge Node.JS 18 function
 */
export class EdgeFunctionJs extends Construct {
    public readonly fn: cf.experimental.EdgeFunction;

    constructor(scope: Construct, id: string, props: EdgeFunctionJsProps) {
        super(scope, id);

        const baseBuildCmds = [
            'export npm_config_cache=$(mktemp -d)',
            'cd $(mktemp -d)',
            'rsync -a /asset-input/* . --exclude node_modules',
            'npm ci --omit=dev',
            'cp -r . /asset-output/',
        ];

        this.fn = new cf.experimental.EdgeFunction(this, 'edge-fn', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: props.handler,
            code: lambda.Code.fromAsset(props.codePath, {
                bundling: {
                    image: lambda.Runtime.NODEJS_18_X.bundlingImage,
                    command: ['bash', '-c', [...baseBuildCmds, ...(props.additionalBuildCmds || [])].join('&&')],
                },
            }),
        });

        if (props.inlinePolicy) this.fn.addToRolePolicy(props.inlinePolicy);
    }
}
