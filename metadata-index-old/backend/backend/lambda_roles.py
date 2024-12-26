"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates IAM Roles for the Lambda functions.
"""

from constructs import Construct
from aws_cdk import (aws_iam as iam , Stack)

class LambdaRoles(Construct):


    _LambdaTaskRole = None

    #Lambda execution role
    def __init__(self, scope: Construct, id: str, db_secret_arn: str = None, opensearch_arn : str = None, datastore_arn: str = None,  database_resource_id : str = None , **kwargs) -> None :
        super().__init__(scope, id, **kwargs)  
        
        self._LambdaTaskRole = iam.Role(self, "Role",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description="This Role is used by the Lambdas to access to subnets."
        )

        if database_resource_id is not None:
            database_access_via_iam_policy_statement = iam.PolicyStatement(
            effect = iam.Effect.ALLOW,
                        actions = ['rds-db:connect'],
                        resources = [f"arn:aws:rds-db:{Stack.of(self).region}:{Stack.of(self).account}:dbuser:{database_resource_id}/ahi_parser"]
                        )
            self._LambdaTaskRole.add_to_policy(database_access_via_iam_policy_statement)

        if db_secret_arn is not None:
            db_secret_policy_statement = iam.PolicyStatement(
            effect = iam.Effect.ALLOW,
                        actions = ['secretsmanager:GetSecretValue'],
                        resources = [db_secret_arn]
                        )
            self._LambdaTaskRole.add_to_policy(db_secret_policy_statement)

        if opensearch_arn is not None:
            # jpleger - 09/06/2023 : this policy is deny all until we implement the solution support for opensearch.
            opensearch_policy_statement = iam.PolicyStatement(
            effect = iam.Effect.DENY,
                        actions = ['es:*'],
                        resources = [db_secret_arn]
                        )
            self._LambdaTaskRole.add_to_policy(opensearch_policy_statement)

        if datastore_arn is not None:
            ahi_policy_statement = iam.PolicyStatement(
            effect = iam.Effect.ALLOW,
                        actions = ["medical-imaging:GetImageSetMetadata"],
                        resources = [
                            datastore_arn,
                            datastore_arn+"/imageset/*"
                            ]
                        )
            self._LambdaTaskRole.add_to_policy(ahi_policy_statement)

        self._LambdaTaskRole.add_managed_policy(iam.ManagedPolicy.from_managed_policy_arn(self, 'LambdaVPC','arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'))
        



    def getLambdaRoleArn(self) -> str:
        return self._LambdaTaskRole.role_arn
    
    def getLambdaRole(self) -> iam.Role:
        return self._LambdaTaskRole
