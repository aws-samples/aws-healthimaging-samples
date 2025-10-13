import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export class OhifOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ===========================================
    // S3 BUCKET FOR OHIF HOSTING
    // ===========================================
    const ohifBucket = new s3.Bucket(this, 'OhifHostingBucket', {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // ===========================================
    // CLOUDFRONT DISTRIBUTION WITH OAC
    // ===========================================

    const distribution = new cloudfront.Distribution(this, 'OhifDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(ohifBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30),
        }
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      comment: 'OHIF Medical Imaging Viewer Distribution'
    });

    // ===========================================
    // COGNITO USER POOL AND CLIENT
    // ===========================================
    const userPool = new cognito.UserPool(this, 'OhifUserPool', {
      userPoolName: 'ohif-medical-imaging-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true
      },
      autoVerify: {
        email: true
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true
        },
        givenName: {
          required: true,
          mutable: true
        },
        familyName: {
          required: true,
          mutable: true
        }
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'OhifUserPoolClient', {
      userPool: userPool,
      userPoolClientName: 'ohif-client',
      generateSecret: false, // Public client for SPA
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
        adminUserPassword: true
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.EMAIL
        ],
        callbackUrls: [
          `https://${distribution.distributionDomainName}/callback`,
          `https://${distribution.distributionDomainName}/`,
          'http://localhost:3000/callback', // For local development
          'http://localhost:3000/'
        ],
        logoutUrls: [
          `https://${distribution.distributionDomainName}/logout`,
          `https://${distribution.distributionDomainName}/`,
          'http://localhost:3000/logout',
          'http://localhost:3000/'
        ]
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO
      ],
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1)
    });

    // Create Cognito Domain for hosted UI
    const userPoolDomain = new cognito.UserPoolDomain(this, 'OhifUserPoolDomain', {
      userPool: userPool,
      cognitoDomain: {
        domainPrefix: `ohif-${this.stackName.toLowerCase()}-${this.account.substring(0, 8)}`
      }
    });

    // Create default admin user using custom resource
    const createUserFunction = new lambda.Function(this, 'CreateUserFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'create_user.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/create-user')),
      timeout: cdk.Duration.seconds(60)
    });

    createUserFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminSetUserPassword'
      ],
      resources: [userPool.userPoolArn]
    }));

    const adminUsername = 'admin';
    const adminPassword = 'TempPass123!';

    new cdk.CustomResource(this, 'CreateAdminUser', {
      serviceToken: createUserFunction.functionArn,
      properties: {
        UserPoolId: userPool.userPoolId,
        Username: adminUsername,
        TemporaryPassword: adminPassword
      }
    });

    // ===========================================
    // AHIDICOMWEB READ-ONLY ROLE
    // ===========================================
    const ahiDicomWebReadOnlyRole = new iam.Role(this, 'AHIDICOMWebReadOnlyRole', {
      roleName: `AHIDICOMWebReadOnlyRole-${this.stackName.toLowerCase()}-${this.account.substring(0, 8)}`,
      assumedBy: new iam.ServicePrincipal('medical-imaging.amazonaws.com'),
      inlinePolicies: {
        DICOMWebReadOnlyPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'medical-imaging:GetDICOMImportJob',
                'medical-imaging:ListDICOMImportJobs',
                'medical-imaging:ListDatastores',
                'medical-imaging:ListImageSetVersions',
                'medical-imaging:SearchDICOMStudies',
                'medical-imaging:GetDICOMInstance',
                'medical-imaging:GetDICOMInstanceFrames',
                'medical-imaging:GetDICOMInstanceMetadata',
                'medical-imaging:GetDICOMSeriesMetadata',
                'medical-imaging:SearchDICOMInstances',
                'medical-imaging:GetDICOMBulkdata',
                'medical-imaging:SearchDICOMSeries'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // ===========================================
    // LAMBDA LAYER WITH BOTO3 1.40.31
    // ===========================================
    const boto3Layer = new lambda.LayerVersion(this, 'Boto3Layer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../layers/boto3'), {
        bundling: {
          image: lambda.Runtime.PYTHON_3_12.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output/python'
          ]
        }
      }),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      description: 'boto3 1.40.31 for HealthImaging Lambda authorizer support'
    });

    // ===========================================
    // LAMBDA LAYER WITH PYTHON-JOSE AND REQUESTS
    // ===========================================
    const pythonJoseLayer = new lambda.LayerVersion(this, 'PythonJoseLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../layers/python-jose'), {
        bundling: {
          image: lambda.Runtime.PYTHON_3_12.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output/python'
          ]
        }
      }),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      description: 'python-jose and requests for JWT validation'
    });

    // ===========================================
    // LAMBDA AUTHORIZER FUNCTION
    // ===========================================
    const authorizerFunction = new lambda.Function(this, 'OidcAuthorizerFunction', {
      functionName: `ohif-oidc-authorizer-${this.stackName.toLowerCase()}-${this.account.substring(0, 8)}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'authorizer.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/authorizer')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      layers: [boto3Layer, pythonJoseLayer],
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: userPoolClient.userPoolClientId,
        AHIDICOMWEB_READONLY_ROLE_ARN: ahiDicomWebReadOnlyRole.roleArn,
        LOG_LEVEL: 'WARNING'
      },
      description: 'OIDC token validator for AWS HealthImaging',
      role: new iam.Role(this, 'AuthorizerRole', {
        assumedBy: new iam.CompositePrincipal(
          new iam.ServicePrincipal('lambda.amazonaws.com'),
          new iam.ServicePrincipal('medical-imaging.amazonaws.com')
        ),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
        ]
      })
    });

    // Create Lambda version
    const authorizerVersion = new lambda.Version(this, 'AuthorizerVersion', {
      lambda: authorizerFunction
    });

    // Create alias with provisioned concurrency
    const authorizerAlias = new lambda.Alias(this, 'AuthorizerAlias', {
      aliasName: 'live',
      version: authorizerVersion
    });

    // Add provisioned concurrency using auto scaling
    const scalableTarget = authorizerAlias.addAutoScaling({
      minCapacity: 10,
      maxCapacity: 10
    });

    // Grant permissions to the authorizer function
    authorizerFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));

    // ===========================================
    // AWS HEALTHIMAGING DATASTORE
    // ===========================================
    
    // Lambda function to create HealthImaging datastore with authorizer
    const createDatastoreFunction = new lambda.Function(this, 'CreateDatastoreFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'create_datastore.handler',
      layers: [boto3Layer],
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/create-datastore')),
      timeout: cdk.Duration.minutes(5)
    });

    createDatastoreFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'medical-imaging:CreateDatastore',
        'medical-imaging:DeleteDatastore',
        'medical-imaging:GetDatastore',
        'medical-imaging:TagResource',
        'lambda:InvokeFunction'
      ],
      resources: ['*']
    }));

    const healthImagingDatastore = new cdk.CustomResource(this, 'HealthImagingDatastoreCustom', {
      serviceToken: createDatastoreFunction.functionArn,
      properties: {
        DatastoreName: this.stackName.toLowerCase(),
        AuthorizerArn: authorizerFunction.functionArn,
        ForceUpdate: Date.now().toString() // Force update to trigger custom resource
      }
    });

    // Set resource policy for HealthImaging service to invoke the Lambda authorizer with source ARN condition
    new lambda.CfnPermission(this, 'HealthImagingInvokePermission', {
      functionName: authorizerFunction.functionArn,
      action: 'lambda:InvokeFunction',
      principal: 'medical-imaging.amazonaws.com',
      sourceArn: `arn:aws:medical-imaging:${this.region}:${this.account}:datastore/${healthImagingDatastore.getAttString('DatastoreId')}`
    });

    // ===========================================
    // CODEPIPELINE AND CODEBUILD FOR OHIF
    // ===========================================
    
    // S3 bucket for pipeline artifacts
    const artifactsBucket = new s3.Bucket(this, 'PipelineArtifactsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true
    });

    // CodeBuild service role
    const codeBuildRole = new iam.Role(this, 'CodeBuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
      ],
      inlinePolicies: {
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket'
              ],
              resources: [
                ohifBucket.bucketArn,
                `${ohifBucket.bucketArn}/*`,
                artifactsBucket.bucketArn,
                `${artifactsBucket.bucketArn}/*`
              ]
            })
          ]
        }),
        CloudFrontAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudfront:CreateInvalidation'
              ],
              resources: [
                `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`
              ]
            })
          ]
        })
      }
    });

    // CodeBuild project for OHIF compilation
    const buildProject = new codebuild.Project(this, 'OhifBuildProject', {
      projectName: `ohif-oidc-build-${this.stackName.toLowerCase()}-${this.account.substring(0, 8)}`,
      description: 'Build and deploy OHIF viewer with OIDC configuration',
      role: codeBuildRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.MEDIUM,
        privileged: false
      },
      environmentVariables: {
        S3_BUCKET: {
          value: ohifBucket.bucketName
        },
        CLOUDFRONT_DISTRIBUTION_ID: {
          value: distribution.distributionId
        },
        COGNITO_USER_POOL_ID: {
          value: userPool.userPoolId
        },
        COGNITO_CLIENT_ID: {
          value: userPoolClient.userPoolClientId
        },
        COGNITO_DOMAIN: {
          value: `${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`
        },
        OHIF_DOMAIN: {
          value: `https://${distribution.distributionDomainName}`
        },
        HEALTHIMAGING_DATASTORE_ID: {
          value: healthImagingDatastore.getAttString('DatastoreId')
        },
        AWS_DEFAULT_REGION: {
          value: this.region
        }
      },
      buildSpec: codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              'runtime-versions': {
                nodejs: '18'
              },
            commands: [
              'echo "Installing dependencies..."',
              'npm install -g yarn',
              'node --version',
              'npm --version',
              'yarn --version',
              'echo "Downloading OHIF v3.11.0..."',
              'wget -O ohif.zip https://github.com/OHIF/Viewers/archive/refs/tags/v3.11.0.zip 1> NUL 2> NUL',
              'unzip -qq ohif.zip',
              'mv Viewers-3.11.0 ohif',
              'cd ohif'
            ]
          },
          pre_build: {
            commands: [
              'echo "Installing OHIF dependencies..."',
              'yarn install --slient --frozen-lockfile'
            ]
          },
          build: {
            commands: [
              'echo "Checking file structure..."',
              'ls -la extensions/default/src/DicomWebDataSource/',
              'echo "Applying OHIF AWS HealthImaging compatibility fixes..."',
              'echo "const fs = require(\\"fs\\");" > apply-fixes.js',
              'echo "console.log(\\"Applying Accept header fix...\\");" >> apply-fixes.js',
              'echo "try {" >> apply-fixes.js',
              'echo "  const asyncLoaderPath = \\"extensions/default/src/DicomWebDataSource/wado/retrieveMetadataLoaderAsync.js\\";" >> apply-fixes.js',
              'echo "  if (fs.existsSync(asyncLoaderPath)) {" >> apply-fixes.js',
              'echo "    let asyncContent = fs.readFileSync(asyncLoaderPath, \\"utf8\\");" >> apply-fixes.js',
              'echo "    asyncContent = asyncContent.replace(/if \\\\(seriesInstanceUID\\\\)/, \\"delete client.headers.Accept;\\\\\\n    if (seriesInstanceUID)\\");" >> apply-fixes.js',
              'echo "    fs.writeFileSync(asyncLoaderPath, asyncContent);" >> apply-fixes.js',
              'echo "    console.log(\\"Applied Accept header fix to async loader\\");" >> apply-fixes.js',
              'echo "  } else {" >> apply-fixes.js',
              'echo "    console.log(\\"File not found: \\" + asyncLoaderPath);" >> apply-fixes.js',
              'echo "  }" >> apply-fixes.js',
              'echo "} catch (error) {" >> apply-fixes.js',
              'echo "  console.error(\\"Error applying fixes:\\", error.message);" >> apply-fixes.js',
              'echo "  process.exit(1);" >> apply-fixes.js',
              'echo "}" >> apply-fixes.js',
              'node apply-fixes.js',
              'echo "Configuring OHIF with OIDC settings..."',
              'mkdir -p platform/app/public/config',
              'echo "window.config = {" > platform/app/public/config/default.js',
              'echo "  routerBasename: \\"/\\\"," >> platform/app/public/config/default.js',
              'echo "  extensions: []," >> platform/app/public/config/default.js',
              'echo "  modes: []," >> platform/app/public/config/default.js',
              'echo "  showStudyList: true," >> platform/app/public/config/default.js',
              'echo "  maxNumRequests: {" >> platform/app/public/config/default.js',
              'echo "    interaction: 200," >> platform/app/public/config/default.js',
              'echo "    thumbnail: 100," >> platform/app/public/config/default.js',
              'echo "    prefetch: 50" >> platform/app/public/config/default.js',
              'echo "  }," >> platform/app/public/config/default.js',
              'echo "  dataSources: [{" >> platform/app/public/config/default.js',
              'echo "    namespace: \\"@ohif/extension-default.dataSourcesModule.dicomweb\\"," >> platform/app/public/config/default.js',
              'echo "    sourceName: \\"dicomweb\\"," >> platform/app/public/config/default.js',
              'echo "    configuration: {" >> platform/app/public/config/default.js',
              'echo "      friendlyName: \\"AWS HealthImaging\\"," >> platform/app/public/config/default.js',
              'echo "      name: \\"aws-healthimaging\\"," >> platform/app/public/config/default.js',
              'echo "      wadoUriRoot: \\"https://dicom-medical-imaging.$AWS_DEFAULT_REGION.amazonaws.com/datastore/$HEALTHIMAGING_DATASTORE_ID\\"," >> platform/app/public/config/default.js',
              'echo "      qidoRoot: \\"https://dicom-medical-imaging.$AWS_DEFAULT_REGION.amazonaws.com/datastore/$HEALTHIMAGING_DATASTORE_ID\\"," >> platform/app/public/config/default.js',
              'echo "      wadoRoot: \\"https://dicom-medical-imaging.$AWS_DEFAULT_REGION.amazonaws.com/datastore/$HEALTHIMAGING_DATASTORE_ID\\"," >> platform/app/public/config/default.js',
              'echo \'      acceptHeader: ["*/*"],\' >> platform/app/public/config/default.js',
              'echo "      qidoSupportsIncludeField: false," >> platform/app/public/config/default.js',
              'echo "      supportsReject: false," >> platform/app/public/config/default.js',
              'echo "      imageRendering: \\"wadors\\"," >> platform/app/public/config/default.js',
              'echo "      thumbnailRendering: \\"wadors\\"," >> platform/app/public/config/default.js',
              'echo "      enableStudyLazyLoad: true," >> platform/app/public/config/default.js',
              'echo "      supportsFuzzyMatching: false," >> platform/app/public/config/default.js',
              'echo "      supportsWildcard: false," >> platform/app/public/config/default.js',
              'echo "      staticWado: false," >> platform/app/public/config/default.js',
              'echo "      singlepart: \\"bulkdata,video\\"," >> platform/app/public/config/default.js',
              'echo "      requestOptions: {" >> platform/app/public/config/default.js',
              'echo "        headers: {" >> platform/app/public/config/default.js',
              'echo "          \\"Authorization\\": \\"Bearer {{ACCESS_TOKEN}}\\"" >> platform/app/public/config/default.js',
              'echo "        }" >> platform/app/public/config/default.js',
              'echo "      }" >> platform/app/public/config/default.js',
              'echo "    }" >> platform/app/public/config/default.js',
              'echo "  }]," >> platform/app/public/config/default.js',
              'echo "  oidc: [{" >> platform/app/public/config/default.js',
              'echo "    authority: \\"https://cognito-idp.$AWS_DEFAULT_REGION.amazonaws.com/$COGNITO_USER_POOL_ID\\"," >> platform/app/public/config/default.js',
              'echo "    client_id: \\"$COGNITO_CLIENT_ID\\"," >> platform/app/public/config/default.js',
              'echo "    redirect_uri: \\"$OHIF_VIEWER_URL/callback\\"," >> platform/app/public/config/default.js',
              'echo "    response_type: \\"code\\"," >> platform/app/public/config/default.js',
              'echo "    scope: \\"openid profile email\\"," >> platform/app/public/config/default.js',
              'echo "    post_logout_redirect_uri: \\"$OHIF_VIEWER_URL/logout\\"," >> platform/app/public/config/default.js',
              'echo "    automaticSilentRenew: true," >> platform/app/public/config/default.js',
              'echo "    revokeAccessTokenOnSignout: false" >> platform/app/public/config/default.js',
              'echo "  }]" >> platform/app/public/config/default.js',
              'echo "};" >> platform/app/public/config/default.js',
              'echo "Configuration file created, contents:"',
              'cat platform/app/public/config/default.js',
              'echo "Building OHIF application..."',
              'yarn run build'
            ]
          },
          post_build: {
            commands: [
              'echo "Uploading built assets to S3..."',
              'aws s3 sync platform/app/dist/ s3://$S3_BUCKET --delete',
              'echo "Creating CloudFront invalidation..."',
              'aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"',
              'echo "Build completed successfully!"'
            ]
          }
        },
        artifacts: {
          files: [
            '**/*'
          ],
          'base-directory': 'platform/app/dist'
        }
      }),
      timeout: cdk.Duration.minutes(60)
    });

    // Remove the complex pipeline setup and just trigger CodeBuild directly
    // The CodeBuild project will handle everything: source from GitHub, build, and deploy

    // Create a trigger file to initialize the pipeline
    const triggerDeployment = new s3deploy.BucketDeployment(this, 'PipelineTrigger', {
      sources: [s3deploy.Source.jsonData('trigger.json', {
        trigger: 'initial-deployment',
        timestamp: Date.now(),
        version: '1.0.0'
      })],
      destinationBucket: artifactsBucket,
      destinationKeyPrefix: 'triggers/',
      retainOnDelete: false
    });

    // Lambda function to trigger CodeBuild execution directly
    const buildTriggerFunction = new lambda.Function(this, 'BuildTriggerFunction', {
      functionName: `ohif-build-trigger-${this.stackName.toLowerCase()}-${this.account.substring(0, 8)}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'build-trigger.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/build-trigger')),
      timeout: cdk.Duration.minutes(5)
    });

    buildTriggerFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'codebuild:StartBuild'
      ],
      resources: [buildProject.projectArn]
    }));

    const buildTrigger = new cdk.CustomResource(this, 'BuildExecutionTrigger', {
      serviceToken: buildTriggerFunction.functionArn,
      properties: {
        ProjectName: buildProject.projectName,
        Timestamp: Date.now() // Force update on each deployment
      }
    });

    // Ensure build trigger runs after all resources are created
    buildTrigger.node.addDependency(buildProject);
    buildTrigger.node.addDependency(distribution);
    buildTrigger.node.addDependency(userPool);
    buildTrigger.node.addDependency(healthImagingDatastore);

    // ===========================================
    // STACK OUTPUTS
    // ===========================================
    
    // IMPORTANT: Admin credentials - displayed first for visibility
    new cdk.CfnOutput(this, 'ADMIN_PASSWORD', {
      value: `🔐 ADMIN LOGIN: Username="${adminUsername}" Password="${adminPassword}" 🔐`,
      description: '⚠️  IMPORTANT: Default admin credentials - CHANGE ON FIRST LOGIN!'
    });

    new cdk.CfnOutput(this, 'OhifViewerUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'OHIF Medical Imaging Viewer URL'
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID'
    });

    new cdk.CfnOutput(this, 'CognitoClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID'
    });

    new cdk.CfnOutput(this, 'CognitoLoginUrl', {
      value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com/login?client_id=${userPoolClient.userPoolClientId}&response_type=code&scope=openid+profile+email&redirect_uri=https://${distribution.distributionDomainName}/callback`,
      description: 'Cognito Hosted UI Login URL'
    });

    new cdk.CfnOutput(this, 'HealthImagingDatastoreId', {
      value: healthImagingDatastore.getAttString('DatastoreId'),
      description: 'AWS HealthImaging Datastore ID'
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: ohifBucket.bucketName,
      description: 'S3 Bucket for OHIF hosting'
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID'
    });

    new cdk.CfnOutput(this, 'CodeBuildProjectName', {
      value: buildProject.projectName,
      description: 'CodeBuild Project Name'
    });

    new cdk.CfnOutput(this, 'ArtifactsBucketName', {
      value: artifactsBucket.bucketName,
      description: 'Build Artifacts Bucket Name'
    });

    new cdk.CfnOutput(this, 'DefaultAdminCredentials', {
      value: `Username: ${adminUsername}, Temporary Password: ${adminPassword} (Change on first login)`,
      description: 'Default admin user credentials'
    });
  }
}
