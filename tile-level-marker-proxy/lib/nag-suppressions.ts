// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { NagSuppressions } from 'cdk-nag';

import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Cluster, FargateTaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';

export function suppressNag(
    vpc: Vpc,
    ecsCluster: Cluster,
    ecsTaskExecutionRole: Role,
    ecsTaskRole: Role,
    fargateTaskDefinition: FargateTaskDefinition,
    accessLogsBucket: Bucket,
    alb: ApplicationLoadBalancer,
    fargateService: ApplicationLoadBalancedFargateService
) {
    NagSuppressions.addResourceSuppressions(
        vpc,
        [
            {
                id: 'AwsSolutions-VPC7',
                reason: 'VPC flow logs not needed for sample code.',
            },
        ],
        true
    );

    NagSuppressions.addResourceSuppressions(
        ecsCluster,
        [
            {
                id: 'AwsSolutions-ECS4',
                reason: 'CloudWatch Container Insights not needed for sample code ECS cluster.',
            },
        ],
        true
    );

    NagSuppressions.addResourceSuppressions(
        ecsTaskExecutionRole,
        [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Controlled by CDK L2 construct.',
            },
        ],
        true
    );

    NagSuppressions.addResourceSuppressions(
        ecsTaskRole,
        [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Allow ECS task access to all AWS HealthImaging image frames. Steps to tighten this control is listed in the FAQ.',
            },
        ],
        true
    );

    NagSuppressions.addResourceSuppressions(
        fargateTaskDefinition,
        [
            {
                id: 'AwsSolutions-ECS2',
                reason: 'Allow environment variables for container configuration that are not secret/confidential values.',
            },
        ],
        true
    );

    NagSuppressions.addResourceSuppressions(
        accessLogsBucket,
        [
            {
                id: 'AwsSolutions-S1',
                reason: 'ALB access logging bucket access logs not needed in sample code.',
            },
        ],
        true
    );

    NagSuppressions.addResourceSuppressions(
        alb,
        [
            {
                id: 'AwsSolutions-EC23',
                reason: 'The security group is expected to allow incoming traffic from TCP/443, as this is a public web interface.',
            },
        ],
        true
    );

    // NagSuppressions.addResourceSuppressions(
    //     fargateService,
    //     [
    //         {
    //             id: 'AwsSolutions-ELB2',
    //             reason: 'Logging is not enabled in sample code for cost savings.',
    //         },
    //     ],
    //     true
    // );
}
