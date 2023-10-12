// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// CDK
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

// Services
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IpAddresses, Peer, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import {
    AwsLogDriver,
    Cluster,
    ContainerImage,
    CpuArchitecture,
    FargateTaskDefinition,
    OperatingSystemFamily,
    Protocol,
} from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import {
    ApplicationListenerRule,
    ApplicationLoadBalancer,
    ApplicationProtocol,
    ListenerAction,
    ListenerCondition,
    SslPolicy,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, Bucket, BucketEncryption, StorageClass } from 'aws-cdk-lib/aws-s3';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

// Custom constructs
import { AwsManagedPrefixList } from './constructs/aws-managed-prefix-list';

// Util
import * as path from 'path';
import { getAlbProtocol } from './helpers/albProtocol';

// Types
import { HealthImagingRegions, AuthMode, AlbDomain, ContainerArchitecture } from '../config.types';

type RegionalProxyProps = {
    ahiRegion: HealthImagingRegions;
    albDomain: AlbDomain;
    authMode: AuthMode;
    cfToAlbSecretName: string;
    cognitoUserPoolId?: string;
    cognitoClientId?: string;
    ssmAlbHttpDnsName?: string;
    proxyLogLevel?: string;
    containerArchitecture: ContainerArchitecture;
    cdkStackProps?: StackProps;
};

export class RegionalProxy extends Stack {
    constructor(scope: Construct, id: string, props: RegionalProxyProps) {
        super(scope, id, props.cdkStackProps);

        const cpuArchitecture =
            props.containerArchitecture === 'x86_64' ? CpuArchitecture.X86_64 : CpuArchitecture.ARM64;
        const containerPlatform =
            props.containerArchitecture === 'x86_64' ? Platform.LINUX_AMD64 : Platform.LINUX_ARM64;
        const albUseHttp = getAlbProtocol(props.albDomain) === 'http';

        /**
         * Create VPC with 2 public and 2 private subnets
         */
        const vpc = new Vpc(this, 'vpc', {
            ipAddresses: IpAddresses.cidr('10.0.0.0/23'),
            maxAzs: 2,
            natGateways: 1,
            subnetConfiguration: [
                {
                    cidrMask: 26,
                    name: 'Public',
                    subnetType: SubnetType.PUBLIC,
                    mapPublicIpOnLaunch: false,
                },
                {
                    cidrMask: 26,
                    name: 'Private',
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
            ],
        });

        /**
         * ECS Fargate ALB
         * ecs_patterns.ApplicationLoadBalancedFargateService will add an inbound rule from the ALB SG on the container port
         */
        const fargateSg = new SecurityGroup(this, 'fargate-sg', {
            description: 'ECS Fargate - incoming from ALB',
            vpc: vpc,
            allowAllOutbound: true,
        });

        /**
         * Compile and upload image to AWS Elastic Container Registry (ECR)
         * DockerImageAsset is designd to use the default CDK bootstrapped ECR repository
         */
        const containerImageAsset = new DockerImageAsset(this, 'container-image', {
            directory: path.join(__dirname, '../ahi-regional-proxy-container'),
            platform: containerPlatform,
        });

        /**
         * Create an ECS cluster
         */
        const ecsCluster = new Cluster(this, 'ecs-cluster', { vpc });

        /**
         * Create task execution IAM role
         *  This is used by the ECS agent and container runtime
         */
        const ecsTaskExecutionRole = new Role(this, 'ecs-task-execution-role', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
        });

        /**
         * Create task IAM role
         * This grants additional permissions by the application after the container is started
         */
        const ecsTaskRole = new Role(this, 'ecs-task-role', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
            inlinePolicies: {
                'Medical-Imaging': new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            actions: ['medical-imaging:*'],
                            resources: ['*'],
                        }),
                    ],
                }),
            },
        });

        /**
         * Create a Fargate task definition
         */
        const fargateTaskDefinition = new FargateTaskDefinition(this, 'fargate-task-definition', {
            memoryLimitMiB: 4096, // 4 GB
            cpu: 2048, // 2 vCPU
            runtimePlatform: {
                operatingSystemFamily: OperatingSystemFamily.LINUX,
                cpuArchitecture: cpuArchitecture,
            },
            executionRole: ecsTaskExecutionRole,
            taskRole: ecsTaskRole,
        });

        /**
         * Create Fargate container definition
         */
        const fargateContainerDefinition = fargateTaskDefinition.addContainer('ahi-regional-proxy', {
            image: ContainerImage.fromDockerImageAsset(containerImageAsset),
            memoryLimitMiB: 4096, // 4 GB
            cpu: 2048, // 2 vCPU
            logging: new AwsLogDriver({
                streamPrefix: 'tlm-proxy-logs',
            }),
            environment: {
                AHI_REGION: props.ahiRegion,
                AUTH_MODE: props.authMode,
                COGNITO_USER_POOL_ID: props.cognitoUserPoolId || '',
                COGNITO_CLIENT_ID: props.cognitoClientId || '',
                PROXY_LOG_LEVEL: props.proxyLogLevel || '',
            },
        });

        /**
         * Add port mapping to container
         */
        fargateContainerDefinition.addPortMappings({
            containerPort: 8080,
            protocol: Protocol.TCP,
        });

        /**
         * S3 bucket for ALB access logs
         */
        const accessLogsBucket = new Bucket(this, 'alb-access-logs-bucket', {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            encryption: BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            lifecycleRules: [
                {
                    transitions: [
                        {
                            storageClass: StorageClass.INTELLIGENT_TIERING,
                            transitionAfter: Duration.days(0),
                        },
                    ],
                },
            ],
            removalPolicy: RemovalPolicy.RETAIN,
        });

        /**
         * Application load balancer
         */
        const alb = new ApplicationLoadBalancer(this, 'alb', {
            vpc: vpc,
            internetFacing: true,
            dropInvalidHeaderFields: true,
        });
        alb.logAccessLogs(accessLogsBucket, 'alb');

        /**
         * Set ALB HTTP/HTTPS options. The string must match exactly
         */
        let fargateAlbListenerOpts = {};
        if (albUseHttp) {
            fargateAlbListenerOpts = {
                listenerPort: 80,
                protocol: ApplicationProtocol.HTTP,
            };
        } else {
            fargateAlbListenerOpts = {
                certificate: Certificate.fromCertificateArn(this, 'certificate', props.albDomain.acmArn),
                listenerPort: 443,
                protocol: ApplicationProtocol.HTTPS,
                sslPolicy: SslPolicy.TLS12_EXT,
            };
        }

        /**
         * Create ALB <-> ECS Fargate
         */
        const fargateService = new ApplicationLoadBalancedFargateService(this, 'ecs-fargate-service', {
            assignPublicIp: false,
            cluster: ecsCluster,
            desiredCount: 1,
            loadBalancer: alb,
            openListener: false,
            publicLoadBalancer: true,
            securityGroups: [fargateSg],
            taskDefinition: fargateTaskDefinition,
            taskSubnets: {
                subnets: vpc.privateSubnets,
            },
            ...fargateAlbListenerOpts,
        });

        /**
         * Update ALB's target group health check to /healthcheck
         */
        fargateService.targetGroup.configureHealthCheck({
            path: '/healthcheck',
        });

        /**
         * Allow only CloudFront origin-facing prefix lists access to the ALB
         */
        const cfOriginFacingPrefixList = new AwsManagedPrefixList(this, 'cf-origin-prefix-list', {
            name: 'com.amazonaws.global.cloudfront.origin-facing',
        }).prefixList;
        fargateService.loadBalancer.connections.allowFrom(
            Peer.prefixList(cfOriginFacingPrefixList.prefixListId),
            albUseHttp ? Port.tcp(80) : Port.tcp(443)
        );

        /**
         * Create a secret in AWS Secrets Manager to store a unique header string
         *  that's required by the ALB to forward requests to ECS Fargate.
         * CloudFront is configured to pass this string
         */
        const cfToAlbSecret = new Secret(this, 'cf-to-alb-secret', {
            description: 'A unique header string required by the ALB to forward requests to ECS Fargate',
            secretName: props.cfToAlbSecretName,
            removalPolicy: RemovalPolicy.DESTROY,
            generateSecretString: {
                excludePunctuation: true,
            },
        });

        /**
         * Forward requests to the ALB only if the custom header matches
         */
        new ApplicationListenerRule(this, 'alb-custom-header-rule', {
            listener: fargateService.listener,
            priority: 1,
            conditions: [ListenerCondition.httpHeader('X-Custom-Header', [cfToAlbSecret.secretValue.unsafeUnwrap()])],
            action: ListenerAction.forward([fargateService.targetGroup]),
        });

        /**
         * Update the default listener rule to return a 403/Access denied
         */
        fargateService.listener.addAction('default-action', {
            action: ListenerAction.fixedResponse(403, { contentType: 'text/plain', messageBody: 'Access denied' }),
        });

        /**
         * If using HTTP ALB, create an SSM string parameter in ahiRegion with the autogenerated ALB DNS name
         * This is used by the CloudFront domain
         */
        if (albUseHttp) {
            new StringParameter(this, 'ssm-alb-http-dns-name', {
                parameterName: props.ssmAlbHttpDnsName,
                stringValue: fargateService.loadBalancer.loadBalancerDnsName,
                description: 'Proxy Fargate Application Load Balancer DNS Name',
            });
        }

        /**
         * Output the ALB URL
         */
        new CfnOutput(this, 'ahi-regional-proxy-alb-url', {
            value: fargateService.loadBalancer.loadBalancerDnsName,
            description: `The URL of the Application Load Balancer. Create a CNAME DNS record pointing ${props.albDomain.domainHostname} to this value.`,
            exportName: 'ahi-regional-proxy-alb-url',
        });
    }
}
