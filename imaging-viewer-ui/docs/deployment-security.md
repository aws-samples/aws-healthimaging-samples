# Deployement Security Considerations

For organizations with strict IAM controls, using the AWS-managed `AdministratorAccess-Amplify` role may not be possible, due to the role having `iam:CreateRole` and other write permissions. These actions are necessary because AWS Amplify creates and configures AWS services, such as Amazon Cognito, on the developer's behalf. This reduces the heavy lift in creating full-stack applications and allows the developer to focus on delivering business outcomes.

The following sections describe policies, focusing on least-privilege for IAM, that can be created to deploy this application using the [Amplify CLI](https://docs.amplify.aws/cli/) and [AWS Identity and Access Management (IAM) permissions boundaries](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html).

## IAM Strategy

First we create an IAM policy to use as a permissions boundary. The permissions boundary policy is attached to Amplify-created roles, and intersects with the role's policies to create effective permissions. For example, if the permissions boundary allows `medical-imaging:*`, and the role policy allows `*.*`, the effective permissions of the role becomes `medical-imaging:*`.

To enforce the attachment of the permissions boundary, we grant `iam:CreateRole`, `iam:AttachRolePolicy`, etc. with the condition that the `iam:PermissionsBoundary` has to match our permissions boundary ARN. To prevent users from updating, detaching, or removing the permissions boundary, we set explicit denys for `iam:DeleteRolePermissionsBoundary`, `iam:DetachRolePolicy`, etc., for the appropriate resources and with the appropriate resources.

## Setup

### Create IAM permissions boundary policy

The permissions boundary can be created manually using the description in [IAM permissions boundary policy](#permissions-boundary-policy). Alternatively, the permissions boundary policy and user access policy can be deployed together using this [CloudFormation template](./deployment-security-cft.yml).

### Create developer role policy

The developer/user role policy can be created manually using the description in [user policies](#user-policies) section of this document. Alternatively, the permissions boundary policy and user access policy can be deployed together using this [CloudFormation template](./deployment-security-cft.yml).

### Install package dependencies

This step requires `Node 18.x` and `npm` to be installed.

```
cd imaging-viewer-ui
npm install
```

### Initialize Amplify

Initialize the Amplify project with the IAM permissions boundary created earlier: `amplify init --permissions-boundary arn:aws:iam::<Account ID>:policy/ImagingViewerPermissionsBoundary`
  - Enter any environment name, or press 'enter' to use the default (dev).
  - Select your default editor using the arrow keys and 'enter.'
  - For the authentication method,
    - It is best practice to use a federated identity with short-lived credentials and *NOT* long-lived credentials (i.e. an IAM user). 
    - You must configure the AWS CLI and [create a profile for your IAM role](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).
    - Refer to your organization's guidance on exporting `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` for your role.

Add web hosting to the project: `amplify add hosting`
  - Select `Amazon CloudFront and S3`.
  - Input an S3 bucket name, or use the default one. This must match the `s3:CreateBucket` policy resource in the [user policy](#amplify-s3).

Publish the Amplify project: `amplify publish`
  - Select `Yes` when prompted to continue.

Note that during the publishing step, the Amplify CLI will build the React application, and upload the result to the S3 hosting bucket. This may take up to 30 minutes. The CLI will return a CloudFront URL after a successful push.

## Permissions Boundary Policy

### AWS HealthImaging

This policy allows all actions within the AWS HealthImaging service. For the rest of this document, this policy is referred to as `ImagingViewerPermissionsBoundary`.

```
    {
      "Sid": "AwsHealthImaging",
      "Effect": "Allow",
      "Action": [
        "medical-imaging:*"
      ],
      "Resource": "*"
    }
```

### Secure Deploy Bucket

Currently, Amplify's deployment S3 bucket does not block all public access. Amplify creates a custom CloudFormation resource that triggers a Lambda function to block all public access on this bucket.

```
    {
        "Sid": "BlockPublicAccess",
        "Effect": "Allow",
        "Action": "s3:PutBucketPublicAccessBlock",
        "Resource": "arn:aws:s3:::amplify-*-deployment"
    },
    {
        "Sid": "GetAmplifyStackDetails",
        "Effect": "Allow",
        "Action": "cloudformation:DescribeStacks",
        "Resource": "arn:aws:cloudformation:*:*:stack/amplify-*"
    }
```

### Amplify Cognito Identity Custom Resource

Amplify creates a custom CloudFormation resource using a Lambda function to call CognitoIdentityServiceProvider.describeUserPoolClient().

```
    {
        "Sid": "AmplifyCognitoIdentityCustomResource",
        "Effect": "Allow",
        "Action": "cognito-idp:DescribeUserPoolClient",
        "Resource": "arn:aws:cognito-idp:*:*:userpool/*"
    }
```

### Amplify IAM Auth/Unauth roles

Amplify creates a custom CloudFormation resource and calls  iam:GetRole and iam:UpdateAssumeRolePolicy for the Cognito user pool's auth and unauth roles. Used by the Amplify base and auth stack Lambda.

```
    {
        "Sid": "AmplifyIamAuthUnauthRoles",
        "Effect": "Allow",
        "Action": [
          "iam:GetRole",
          "iam:UpdateAssumeRolePolicy"
        ],
        "Resource": [
          "arn:aws:iam::*:role/amplify-*-authRole",
          "arn:aws:iam::*:role/amplify-*-unauthRole"
        ]
    }
```

### Amplify Custom Resource Logging

Amplify custom CloudFormation resources' logging.

```
    {
        "Sid": "AmplifyCustomResourceLogging",
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": [
          "arn:aws:logs:*:*:*"
        ]
    }
```

## User Policies

The following policies should be applied to the developer's IAM role.

### Amplify Read Only

These read-only actions allow Describe, Get, and List actions for the services below. They are used by the Amplify CLI, as outlined [here](https://docs.amplify.aws/cli/reference/iam/).

-   amplify\*
-   cloudformation\*
-   cognito-identity\*
-   cognito-idp\*
-   iam
-   lambda\*
-   logs
-   s3

_\* Actions include wildcards, e.g. Get*, List*, Describe\*_

```
    {
        "Sid": "AmplifyReadOnly",
        "Effect": "Allow",
        "Action": [
            "amplify:Get*",
            "amplify:List*",
            "apigateway:Get*",
            "cloudformation:Describe*",
            "cloudformation:List*",
            "cloudformation:Get*",
            "cognito-identity:Describe*",
            "cognito-identity:GetIdentityPoolRoles",
            "cognito-identity:ListIdentityPools",
            "cognito-idp:GetUserPoolMfaConfig",
            "cognito-idp:List*",
            "iam:GetPolicy",
            "iam:GetRole",
            "iam:GetRolePolicy",
            "iam:GetUser",
            "lambda:Get*",
            "lambda:List*",
            "logs:DescribeLogStreams",
            "logs:GetLogEvents",
            "s3:GetBucketLocation",
            "s3:GetObject",
            "s3:ListAllMyBuckets",
            "s3:ListBucket",
            "s3:ListBucketVersions"
        ],
        "Resource": "*"
    }
```

### Amplify Create IAM Roles With Permission Boundary

Amplify creates IAM roles for its base, authentication and function stacks. This lets Amplify run `iam:CreateRole` and iam:`PutRolePolicy` with limiting resource names and a PermissionBoundary condition. The Amplify application will need to be initialized with `init --permissions-boundary <policy ARN>` to allow Amplify to create roles with the permissions boundary attached.

Base stack:

-   amplify-\*-authrole
-   amplify-\*-unauthRole

Auth stack:

-   amplify-\*-authRole-idp
-   \*ClientLambdaRole\*

Function stack(s):

-   \*LambdaRole\*

```
    {
      "Sid": "AmplifyCreateIamRolesWithPermissionBoundary",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:PutRolePolicy"
      ],
      "Resource": [
        "arn:aws:iam::*:role/amplify-*-authRole",
        "arn:aws:iam::*:role/amplify-*-authRole-idp",
        "arn:aws:iam::*:role/amplify-*-unauthRole",
        "arn:aws:iam::*:role/*LambdaRole*"
      ],
      "Condition": {
        "ArnLike": {
          "iam:PermissionsBoundary": "arn:aws:iam::*:policy/ImagingViewerPermissionsBoundary"
        }
      }
    }
```

### Amplify IAM Delete Role

Allow the Amplify CLI to delete roles for cleanup.

```
    {
      "Sid": "AmplifyIamDeleteRole",
      "Effect": "Allow",
      "Action": [
        "iam:DeleteRole",
        "iam:DeleteRolePolicy"
      ],
      "Resource": [
        "arn:aws:iam::*:role/amplify-*",
        "arn:aws:iam::*:role/*LambdaRole*"
      ]
    }
```

### Amplify Auth Lambda PassRole

Allow the Amplify CLI auth stack to pass roles to Lambda. This is for the `UserPoolClientInputs` `Custom::LambdaCallout` resource.

```
    {
      "Sid": "AmplifyAuthLambdaPassRole",
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": [
        "arn:aws:iam::*:role/*LambdaRole*"
      ],
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "lambda.amazonaws.com"
        }
      }
    }
```

### Amplify Auth Cognito PassRole

Allow the Amplify CLI auth stack to pass roles to Cognito. This is for `AWS::Cognito::IdentityPoolRoleAttachment`. Note that `cognito-identity` does not support `iam:PassedToService`\*, hence the condition is not added.

_Tested with StringLike: iam:PassedToService: _.amazonaws.com with no success

```
    {
      "Sid": "AmplifyAuthCognitoPassRole",
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": [
        "arn:aws:iam::*:role/amplify-*-authRole",
        "arn:aws:iam::*:role/amplify-*-authRole-idp",
        "arn:aws:iam::*:role/amplify-*-unauthRole"
      ]
    }
```

### Amplify IAM Tag

Amplify-created IAM roles are tagged with keys user:Application and user:Stack.

```
    {
      "Sid": "AmplifyIamTag",
      "Effect": "Allow",
      "Action": [
        "iam:TagRole"
      ],
      "Resource": [
        "arn:aws:iam::*:role/amplify-*",
        "arn:aws:iam::*:role/*LambdaRole*"
      ]
    }
```

### Deny Permissions Boundary Deletion

Deny the user from deleting the permission boundary created in the template.

```
    {
      "Sid": "DenyPermissionsBoundaryDeletion",
      "Effect": "Deny",
      "Action": "iam:DeleteRolePermissionsBoundary",
      "Resource": "*",
      "Condition": {
        "ArnLike": {
          "iam:PermissionsBoundary": "arn:aws:iam::*:policy/ImagingViewerPermissionsBoundary"
        }
      }
    }
```

### Deny Policy Change

Deny the user from changing the permission boundary policy.

```
    {
      "Sid": "DenyPolicyChange",
      "Effect": "Deny",
      "Action": [
        "iam:CreatePolicyVersion",
        "iam:DeletePolicyVersion",
        "iam:DetachRolePolicy",
        "iam:SetDefaultPolicyVersion"
      ],
      "Resource": "arn:aws:iam::*:policy/ImagingViewerPermissionsBoundary"
    }
```

### Amplify S3

Amplify creates an S3 bucket for deploying resources. The bucket used internally by Amplify is named amplify-\*deployment. The bucket used by S3 and CloudFront defaults to <project name>-<timestamp>-hostingbucket-<backend name>, but can be overridden by the CLI during `amplify add hosting`.

```
    {
      "Sid": "AmplifyS3",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:DeleteBucketPolicy",
        "s3:DeleteBucketWebsite",
        "s3:DeleteObject",
        "s3:DeleteObjectVersion",
        "s3:PutBucketTagging",
        "s3:PutBucketAcl",
        "s3:PutBucketCORS",
        "s3:PutBucketNotification",
        "s3:PutBucketPolicy",
        "s3:PutBucketWebsite",
        "s3:PutEncryptionConfiguration",
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:*:s3:::amplify-*-deployment",
        "arn:*:s3:::amplify-*-deployment/*",
        "arn:*:s3:::*hostingbucket*",
        "arn:*:s3:::*hostingbucket*/*"
      ]
    }
```

### Amplify CloudFormation

Amplify uses CloudFormation to deploy its resources. Allow the user to do CRUD operations on stacks, changesets and stacksets with the amplify\* name.

```
    {
      "Sid": "AmplifyCloudFormation",
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:CreateChangeSet",
        "cloudformation:ExecuteChangeSet",
        "cloudformation:DeleteStackSet",
        "cloudformation:CreateStackSet",
        "cloudformation:UpdateStackSet"
      ],
      "Resource": [
        "arn:aws:cloudformation:*:*:stack/amplify-*"
      ]
    }
```

### Amplify Service

Allow the user access to Amplify services.

```
    {
      "Sid": "AmplifyService",
      "Effect": "Allow",
      "Action": [
        "amplify:CreateApp",
        "amplify:CreateBackendEnvironment",
        "amplify:CreateBranch",
        "amplify:CreateDeployment",
        "amplify:DeleteApp",
        "amplify:DeleteBackendEnvironment",
        "amplify:DeleteBranch",
        "amplify:StartDeployment",
        "amplify:UpdateApp"
      ],
      "Resource": [
        "*"
      ]
    }
```

### Amplify CLI Cognito Identity

Allow access to Cognito Identity services for authentication via the Amplify CLI.

```
    {
      "Sid": "AmplifyCliCognitoIdentity",
      "Effect": "Allow",
      "Action": [
        "cognito-identity:CreateIdentityPool",
        "cognito-identity:DeleteIdentityPool",
        "cognito-identity:SetIdentityPoolRoles",
        "cognito-identity:TagResource",
        "cognito-identity:UpdateIdentityPool"
      ],
      "Resource": [
        "*"
      ]
    }
```

### Amplify CLI Cognito IDP

Allow access to Cognito Identity Provider services for authentication via the Amplify CLI.

```
    {
      "Sid": "AmplifyCliCognitoIdp",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:CreateGroup",
        "cognito-idp:CreateUserPool",
        "cognito-idp:CreateUserPoolClient",
        "cognito-idp:DeleteGroup",
        "cognito-idp:DeleteUser",
        "cognito-idp:DeleteUserPool",
        "cognito-idp:DeleteUserPoolClient",
        "cognito-idp:DescribeIdentityProvider",
        "cognito-idp:DescribeUserPool",
        "cognito-idp:DescribeUserPoolClient",
        "cognito-idp:UpdateGroup",
        "cognito-idp:UpdateUserPool",
        "cognito-idp:UpdateUserPoolClient"
      ],
      "Resource": [
        "*"
      ]
    }
```

### Amplify CLI Lambda

Allow access to Lambda via the Amplify CLI. Built-in functions names start with 'amplify-\*'.

```
    {
      "Sid": "AmplifyCliLambda",
      "Effect": "Allow",
      "Action": [
        "lambda:AddLayerVersionPermission",
        "lambda:AddPermission",
        "lambda:CreateEventSourceMapping",
        "lambda:CreateFunction",
        "lambda:DeleteEventSourceMapping",
        "lambda:DeleteFunction",
        "lambda:DeleteLayerVersion",
        "lambda:InvokeAsync",
        "lambda:InvokeFunction",
        "lambda:PublishLayerVersion",
        "lambda:TagResource",
        "lambda:RemoveLayerVersionPermission",
        "lambda:RemovePermission",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration"
      ],
      "Resource": [
        "arn:aws:lambda:*:*:function:*"
      ]
    }
```

### Amplify CLI CloudFront

Allow access to CloudFrnot via the Amplify CLI.

```
    {
      "Sid": "AmplifyCliCloudFront",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateCloudFrontOriginAccessIdentity",
        "cloudfront:CreateDistribution",
        "cloudfront:DeleteCloudFrontOriginAccessIdentity",
        "cloudfront:DeleteDistribution",
        "cloudfront:GetCloudFrontOriginAccessIdentity",
        "cloudfront:GetCloudFrontOriginAccessIdentityConfig",
        "cloudfront:GetDistribution",
        "cloudfront:GetDistributionConfig",
        "cloudfront:TagResource",
        "cloudfront:UntagResource",
        "cloudfront:UpdateCloudFrontOriginAccessIdentity",
        "cloudfront:UpdateDistribution"
      ],
      "Resource": "*"
    }
```

### Amplify CLI SSM Store

Allow Amplify to store the deployment bucket name in SSM parameter store.

```
    {
      "Sid": "AmplifyCliSsmStore",
      "Effect": "Allow",
      "Action": [
        "ssm:PutParameter",
        "ssm:DeleteParameter"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/amplify*"
    }
```