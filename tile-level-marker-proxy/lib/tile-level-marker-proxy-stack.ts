// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// CDK
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';

// Misc
import * as path from 'path';

// CDK-Nag
import { suppressNag } from './nag-suppressions';

import {
    ACM_ARN,
    COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID,
    ENABLE_ELASTICACHE,
    AUTH_MODE,
    AHI_REGION,
    AHI_ENDPOINT,
} from '../config';

// Port number for Amazon ElastiCache Memcached
const MEMCACHED_PORT = 22322;

export class TileLevelMarkerProxyStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Check for required values
        if (ACM_ARN === '') {
            throw new Error(
                'AWS Certificate Manager ARN must be defined in config.ts. See README.'
            );
        }
        if (String(AUTH_MODE) !== 'null' && COGNITO_USER_POOL_ID === '') {
            throw new Error(
                'Amazon Cognito user pool ID must be defined in config.ts if using authentication. See README.'
            );
        }

        // Create 2 public subnets in order avoid NAT gateway charges
        const vpc = new ec2.Vpc(this, 'vpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/23'),
            maxAzs: 2,
            subnetConfiguration: [
                {
                    cidrMask: 26,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                    mapPublicIpOnLaunch: false,
                },
            ],
        });

        // ECS Fargate ALB
        // The ecs_patterns.ApplicationLoadBalancedFargateService construct will add an inbound rule from the ALB SG on the container port
        const fargateSg = new ec2.SecurityGroup(this, 'fargate-sg', {
            description: 'ECS Fargate - incoming from ALB',
            vpc: vpc,
            allowAllOutbound: true,
        });

        // Create a single-AZ Amazon Elasticache for memcached if enabled, in the VPC created above
        // Set the cache endpoint as a container environment variable
        let elasticacheEndpoint = {
            address: '',
            port: '',
        };
        if (ENABLE_ELASTICACHE) {
            // Security group - allow from the ECS Fargate SG on Memcached port.
            // No outgoing rules because security groups are stateful.
            const elasticacheSg = new ec2.SecurityGroup(
                this,
                'elasticache-sg',
                {
                    description:
                        'Elasticache Memcached - incoming from Fargate, outgoing to Fargate',
                    vpc: vpc,
                    allowAllOutbound: false,
                }
            );
            elasticacheSg.connections.allowFrom(
                fargateSg,
                ec2.Port.tcp(MEMCACHED_PORT)
            );

            // Parameter group
            const cacheParameterGroup = new elasticache.CfnParameterGroup(
                this,
                'cache-parameter-group',
                {
                    cacheParameterGroupFamily: 'memcached1.6',
                    description:
                        'AWS HealthImaging Tile Lever Marker Proxy Cache Parameter Group',
                    properties: {
                        max_item_size: '52428800',
                        slab_chunk_max: '1048576',
                        lru_crawler: '1',
                        lru_maintainer: '1',
                    },
                }
            );
            // Subnet group
            const cacheSubnetGroup = new elasticache.CfnSubnetGroup(
                this,
                'cache-subnet-group',
                {
                    description:
                        'AWS HealthImaging Tile Lever Marker Proxy Cache Subnet Group',
                    // use the first subnet for memcached. to use all available subnets, use subnetIds: vpc.publicSubnets.map((s) => s.subnetId)
                    subnetIds: [vpc.publicSubnets[0].subnetId],
                }
            );

            // Cluster
            const cacheCluster = new elasticache.CfnCacheCluster(
                this,
                'cache-cluster',
                {
                    cacheNodeType: 'cache.t3.medium',
                    engine: 'memcached',
                    numCacheNodes: 1,
                    cacheParameterGroupName: cacheParameterGroup.ref,
                    cacheSubnetGroupName: cacheSubnetGroup.ref,
                    engineVersion: '1.6.17', // latest as of 2023-06-12
                    port: MEMCACHED_PORT,
                    vpcSecurityGroupIds: [elasticacheSg.securityGroupId],
                }
            );
            cacheCluster.node.addDependency(cacheParameterGroup);
            cacheCluster.node.addDependency(cacheSubnetGroup);
            cacheCluster.node.addDependency(elasticacheSg);

            elasticacheEndpoint.address =
                cacheCluster.attrConfigurationEndpointAddress;
            elasticacheEndpoint.port =
                cacheCluster.attrConfigurationEndpointPort;
        }

        // Compile and upload image to AWS ECR
        // DockerImageAsset is designd to use the default CDK bootstrapped ECR repository
        const containerImageAsset = new DockerImageAsset(
            this,
            'container-image',
            {
                directory: path.join(__dirname, '../tlm-proxy-container'),
                platform: Platform.LINUX_AMD64,
            }
        );

        // Create an ECS cluster
        const ecsCluster = new ecs.Cluster(this, 'ecs-cluster', { vpc });

        // Create task execution IAM role
        // This is used by the ECS agent and container runtime
        const ecsTaskExecutionRole = new iam.Role(
            this,
            'ecs-task-execution-role',
            {
                assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            }
        );

        // Create task IAM role
        // This grants additional permissions by the application after the container is started
        const ecsTaskRole = new iam.Role(this, 'ecs-task-role', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            inlinePolicies: {
                'Medical-Imaging-GetFrames': new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: ['medical-imaging:GetImageFrame'],
                            resources: ['*'],
                        }),
                    ],
                }),
            },
        });

        // Create a Fargate task definition
        const fargateTaskDefinition = new ecs.FargateTaskDefinition(
            this,
            'fargate-task-definition',
            {
                memoryLimitMiB: 4096, // 4 GB
                cpu: 2048, // 2 vCPU
                runtimePlatform: {
                    operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                    cpuArchitecture: ecs.CpuArchitecture.X86_64,
                },
                executionRole: ecsTaskExecutionRole,
                taskRole: ecsTaskRole,
            }
        );

        // Container environment variables
        let containerEnvironmentVariables = {
            AUTH_MODE: String(AUTH_MODE),
            COGNITO_USER_POOL_ID: String(COGNITO_USER_POOL_ID),
            COGNITO_CLIENT_ID: String(COGNITO_CLIENT_ID),
            AHI_REGION: String(AHI_REGION),
            AHI_ENDPOINT: String(AHI_ENDPOINT),
        };
        if (ENABLE_ELASTICACHE) {
            const elasticacheEnvironmentVariables = {
                MEMCACHED_ADDRESS: `${elasticacheEndpoint.address}:${elasticacheEndpoint.port}`,
            };
            containerEnvironmentVariables = {
                ...containerEnvironmentVariables,
                ...elasticacheEnvironmentVariables,
            };
        }

        // Create a Fargate container definition
        const fargateContainerDefinition = fargateTaskDefinition.addContainer(
            'tlm-proxy-server',
            {
                image: ecs.ContainerImage.fromDockerImageAsset(
                    containerImageAsset
                ),
                memoryLimitMiB: 4096, // 4 GB
                cpu: 2048, // 2 vCPU
                logging: new ecs.AwsLogDriver({
                    streamPrefix: 'tlm-proxy-logs',
                }),
                environment: containerEnvironmentVariables,
            }
        );

        // Add port mapping to container
        fargateContainerDefinition.addPortMappings({
            containerPort: 8080,
            protocol: ecs.Protocol.TCP,
        });

        // S3 bucket for ALB access logs
        const accessLogsBucket = new s3.Bucket(this, 'accessLogsBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            lifecycleRules: [
                {
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INTELLIGENT_TIERING,
                            transitionAfter: cdk.Duration.days(0),
                        },
                    ],
                },
            ],
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // ALB
        const alb = new elbv2.ApplicationLoadBalancer(this, 'alb', {
            vpc: vpc,
            internetFacing: true,
            dropInvalidHeaderFields: true,
        });
        alb.logAccessLogs(accessLogsBucket, 'alb');

        // Create ALB <-> ECS Fargate
        const fargateService =
            new ecs_patterns.ApplicationLoadBalancedFargateService(
                this,
                'ecs-fargate-service',
                {
                    // to be able to pull the ecr image, use 1/ public subnet with a public IP or 2/ private subnet with routing through a NAT gateway
                    assignPublicIp: true,
                    certificate: acm.Certificate.fromCertificateArn(
                        this,
                        'certificate',
                        ACM_ARN
                    ),
                    cluster: ecsCluster,
                    desiredCount: 2,
                    listenerPort: 443,
                    loadBalancer: alb,
                    protocol: elbv2.ApplicationProtocol.HTTPS,
                    publicLoadBalancer: true,
                    securityGroups: [fargateSg],
                    sslPolicy: elbv2.SslPolicy.TLS12_EXT,
                    taskDefinition: fargateTaskDefinition,
                    // if elasticache is enabled, use the first subnet to reduce cross-AZ data transfer charges. otherwise use all available subnets
                    taskSubnets: {
                        subnets: ENABLE_ELASTICACHE
                            ? [vpc.publicSubnets[0]]
                            : vpc.publicSubnets,
                    },
                }
            );

        // Update ALB's target group health check to /healthcheck
        fargateService.targetGroup.configureHealthCheck({
            path: '/healthcheck',
        });

        // Output the ALB's URL
        new cdk.CfnOutput(this, 'alb-url', {
            value: fargateService.loadBalancer.loadBalancerDnsName,
            description: 'The URL of the Application Load Balancer',
            exportName: 'albUrl',
        });

        // Suppress CDK-Nag rules
        suppressNag(
            vpc,
            ecsCluster,
            ecsTaskExecutionRole,
            ecsTaskRole,
            fargateTaskDefinition,
            accessLogsBucket,
            alb,
            fargateService
        );
    }
}
