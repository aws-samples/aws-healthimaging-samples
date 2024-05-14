#!/usr/bin/env python3

import os
from constructs import Construct
from aws_cdk import (
    App,
    CfnOutput,
    Duration,
    Environment,
    Stack,
    RemovalPolicy,
    aws_ec2 as ec2,
    aws_s3 as s3,
    aws_ecr as ecr,
    aws_iam as iam,
    aws_ecr_assets as ecrassets,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns
)

import cfg

class S3StoreSCPStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        region = self.region
        account = self.account
        
        # S3 bucket for received DICOM, create if none provided
        if cfg.RECEIVE_BUCKET_NAME:
            # existing S3 bucket provided
            receive_bucket = s3.Bucket.from_bucket_name(
                scope=self,
                id="ReceiveBucket",
                bucket_name=cfg.RECEIVE_BUCKET_NAME
            )
            #receive_bucket_name = cfg.RECEIVE_BUCKET_NAME
        else:
            # no receive bucket provided, create one
            receive_bucket = s3.Bucket(
                scope=self,
                id="ReceiveBucket",
                encryption=s3.BucketEncryption.S3_MANAGED,
                removal_policy=RemovalPolicy.DESTROY,
                auto_delete_objects=True,
                block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
                enforce_ssl=True,
                # optionally turn on versioning:
                #versioned=True,
            )
        
        # S3 bucket for Logging
        log_bucket = s3.Bucket(
            scope=self,
            id="LogBucket",
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            # optionally turn on versioning:
            #versioned=True,
        )
        
        # VPC
        # https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2-readme.html#control-over-availability-zones
        vpc = ec2.Vpc(
            scope=self,
            id='VPC',
            max_azs=3,
            ip_addresses=ec2.IpAddresses.cidr(cfg.VPC_CIDR),
            subnet_configuration=[
                # modify here to change the types of subnets provisioned as part of the VPC
                ec2.SubnetConfiguration(
                    subnet_type=ec2.SubnetType.PUBLIC, 
                    name="Public", 
                    cidr_mask=24,
                    map_public_ip_on_launch=False,
                ),
                ec2.SubnetConfiguration(
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    name="PrivateWithEgress",
                    cidr_mask=24,
                ),
            ],
            nat_gateway_provider=ec2.NatProvider.gateway(),
            nat_gateways=1,  # Set number of NAT GWs to provision - default is one per one per AZ
        )

        # VPC Endpoint for S3 (Gateway)
        #s3_gw_vpce = vpc.add_gateway_endpoint("s3GwVpce",service=ec2.GatewayVpcEndpointAwsService.S3)
        s3_gw_vpce = ec2.GatewayVpcEndpoint(
            scope=self, 
            id='s3GwVpce',
            service=ec2.GatewayVpcEndpointAwsService.S3,
            vpc=vpc,
            # optionally limit which subnets will have routes to the endpoint:
            #subnets=[ec2.SubnetSelection(
            #    subnet_type=ec2.SubnetType.PRIVATE_WITH_NAT
            #)]
        )
        
        # create ECS cluster
        cluster = ecs.Cluster(
            scope=self,
            id='ECSCluster',
            vpc=vpc,
            # optionally turn on Container Insights :
            #container_insights=True,
        )
        
        # Build Docker asset
        asset = ecrassets.DockerImageAsset(
            scope=self,
            id='DockerAsset',
            directory='container',
            build_args={
                "SCP_PORT": str(cfg.SCP_PORT),
                "STUNNEL_PORT": str(cfg.STUNNEL_PORT)
            }
        )	
        
        # Fargate Task Properties
        cfg.ENVIRONMENT["AWS_REGION"] = region
        cfg.ENVIRONMENT["RECEIVE_BUCKET"] = receive_bucket.bucket_name
        # stringify all envvars:
        cfg.ENVIRONMENT = {key: str(cfg.ENVIRONMENT[key]) for key in cfg.ENVIRONMENT.keys()}
        task_image_props=ecs_patterns.NetworkLoadBalancedTaskImageProps(
            image=ecs.ContainerImage.from_docker_image_asset(asset),
            container_name="s3storescp",
            container_ports=[
                cfg.SCP_PORT,
                cfg.STUNNEL_PORT
            ],
            environment=cfg.ENVIRONMENT
        )


        # Listeners and Target groups for the Fargate NLB
        if cfg.ALLOW_NON_TLS_PORT :
            listeners=[
                    ecs_patterns.NetworkListenerProps(name="storescp",port=cfg.SCP_PORT),
                    ecs_patterns.NetworkListenerProps(name='stunnel',port=cfg.STUNNEL_PORT)
            ]
            target_groups=[
                ecs_patterns.NetworkTargetProps(listener="storescp",container_port=cfg.SCP_PORT), 
                ecs_patterns.NetworkTargetProps(listener="stunnel",container_port=cfg.STUNNEL_PORT)
            ]
        else :
            listeners=[
                    ecs_patterns.NetworkListenerProps(name='stunnel',port=cfg.STUNNEL_PORT)
            ]
            target_groups=[
                ecs_patterns.NetworkTargetProps(listener="stunnel",container_port=cfg.STUNNEL_PORT)
            ]

        # Fargate Service
        fargate_service = ecs_patterns.NetworkMultipleTargetGroupsFargateService(
            scope=self,
            id='FG',
            cluster=cluster,
            cpu=cfg.TASK_CPU,
            memory_limit_mib=cfg.TASK_MEMORY_MIB,
            desired_count=cfg.TASK_COUNT,
            task_image_options=task_image_props,
            # enable below to be able to exec ssh to the Fargate container
            enable_execute_command=cfg.TASK_ENABLE_EXEC_COMMAND,
            load_balancers=[ecs_patterns.NetworkLoadBalancerProps(
                name="NLB",
                public_load_balancer=cfg.PUBLIC_LOAD_BALANCER,
                listeners=listeners
                )
            ],
            target_groups=target_groups
        )
    
        # configure access logging for the load balancer
        for lb in fargate_service.load_balancers:
            lb.log_access_logs(log_bucket, prefix="NLB-Access-Logs")
    
        # Set max tasks value for Autoscaling
        fargate_scaling_group = fargate_service.service.auto_scale_task_count(
            max_capacity=cfg.AUTOSCALE_MAX_TASKS
        )
        
        # Autoscaling policy for the fargate service - CPU utilization
        fargate_scaling_group.scale_on_cpu_utilization(
            "CpuScaling",
            target_utilization_percent=50,
            scale_in_cooldown=Duration.seconds(60),
            scale_out_cooldown=Duration.seconds(60),
        )
        
        # Enable client IP preservation on the LB target groups (needed for Allow List inspection)
        for target_group in fargate_service.target_groups:
            target_group.set_attribute('preserve_client_ip.enabled','true')
        
        # S3 access policy statement for the task role
        policy_statement = iam.PolicyStatement(
            effect = iam.Effect.ALLOW,
            actions = [
                    's3:ListBucket',
                    's3:PutObject'
                ],
                resources = [
                    receive_bucket.bucket_arn, 
                    f"{receive_bucket.bucket_arn}/*"
                ]
        )
        
        # Grant S3 bucket access to the Fargate task role
        fargate_service.task_definition.task_role.add_to_principal_policy(policy_statement)
        
        # List of ports to use in Security Group rules
        if cfg.ALLOW_NON_TLS_PORT :
            port_list = [cfg.SCP_PORT,cfg.STUNNEL_PORT]
        else :
            port_list = [cfg.STUNNEL_PORT]
        
        # Security Group rules
        # iterate through ports and peers and build Security Group rules
        for port in port_list :
            # VPC access
            fargate_service.service.connections.security_groups[0].add_ingress_rule(
                peer = ec2.Peer.ipv4(vpc.vpc_cidr_block),
                connection = ec2.Port.tcp(port),
                description="Allow from VPC"
                )

            # Peer access
            for cidr in cfg.ALLOWED_PEERS :
                fargate_service.service.connections.security_groups[0].add_ingress_rule(
                peer = ec2.Peer.ipv4(cidr),
                connection = ec2.Port.tcp(port),
                description="Allow from " + cidr
                )

app = App()
S3StoreSCPStack(
    app, 
    cfg.APP_NAME, 
    description=cfg.CFN_STACK_DESCRIPTION, 
    #env={'region':cfg.DEPLOY_REGION}
    
    # If you don't specify 'env', this stack will be environment-agnostic.
    # Account/Region-dependent features and context lookups will not work,
    # but a single synthesized template can be deployed anywhere.

    # Uncomment the next line to specialize this stack for the AWS Account
    # and Region that are implied by the current CLI configuration.

    env=Environment(account=os.getenv('CDK_DEFAULT_ACCOUNT'), region=os.getenv('CDK_DEFAULT_REGION')),

    # Uncomment the next line if you know exactly what Account and Region you
    # want to deploy the stack to. */

    #env=Environment(account='123456789012', region='us-east-1'),

    # For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html
    )
app.synth()
