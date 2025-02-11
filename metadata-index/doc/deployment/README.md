# Deployment Instructions

In this section, we walk through the following instructions:

1. Create a deployment environment.
2. Install prerequisite software packages.
3. Create an HealthImaging data store.
4. Configure the `metadata-index` solution.
5. Deploy the `metadata-index` solution.
6. (Optional) Launch an Amazon EC2 Windows Server instance and install MySQL Workbench.

We will use the EC2 Windows Server instance and MySQL Workbench to query the Aurora MySQL metadata store.

## Create deployment environment

Please set up a local deployment environment that has installed
[Docker](https://docs.docker.com/engine/install/) and
[Node.js](https://nodejs.org/en/download/package-manager/all) on a supported Linux platform.
Please make sure that your local environment has sufficient compute power (at least 2 vCPU’s), memory (at least 8 GiB), and storage (at least 10 GB).

Alternatively, you can deploy a m5.large EC2 Amazon Linux instance with 10 GB of gp3 storage as a remote deployment environment.  For instructions, please refer to the
[Get started with EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html) documentation,
and install
[Docker](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-docker.html#install-docker-instructions) and
[Node.js](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-up-node-on-ec2-instance.html)
on the EC2 instance.

On your deployment environment, please install
[AWS Command Line Interface (AWS CLI) v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html),
[AWS Cloud Development Kit (AWS CDK)](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html), and
[AWS credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-authentication.html).
Please make sure that your AWS credentials are associated with an IAM role or user with sufficient IAM permissions for CDK deployment.

## Install prerequisite software packages

You will need the following software packages installed locally to deploy this solution in your AWS account.

**Python3/pip:**<br>The deployment automation code is written in Python.

**CDK:**<br>Please refer to CDK documentation to install the framework and bootstrap your AWS environment.

**Docker:**<br>When running the CDK deploy command, the container images will automatically be built (via docker build command), and sent to AWS ECR registry. Docker must be present on the machine where the cdk deployment is executed. Docker desktop is sufficient. Refer to Docker Desktop documentation to install it on your machine.

**Compatible region:**<br>As of 09/01/2024 this project is compatible in the following regions: US East (N. Virginia), US West (Oregon), Asia Pacific (Sydney), and Europe (Ireland).

## Create AWS HealthImaging data store

If you do not have an existing HealthImaging data store, you can create one by following the instructions for
[creating a data store](https://catalog.workshops.aws/introduction-to-medical-imaging/en-US/010-lab1/050-create-datastore) in
the [Introduction to AWS HealthImaging](https://catalog.workshops.aws/introduction-to-medical-imaging/en-US) workshop.

## Configure the `metadata-index` solution

In this section, we walk through the following instructions:

1. Download `metadata-index` solution directory.
1. Edit `config.py` file: `[project root]/backend/config.py`.
2. Edit `cdk.context.json` file: `[project root]/backend/cdk.context.json`.

### Download `metadata-index` solution directory

1. From your deployment environment, clone the `aws-healthimaging-samples` repository:

```
git clone https://github.com/aws-samples/aws-healthimaging-samples.git 
```

2. Change your working directory to the `metadata-index` solution directory:

```
cd aws-healthimaging-samples/metadata-index/backend
```

### Edit `config.py` file

The `config.py` file is located at: `[project root]/backend/config.py`.

At a minimum, you must perform the following changes:

1. Copy the Amazon Resource Name (ARN) of your HealthImaging data store.
2. Set the `AHI_DATASTORE_ARN` parameter to the ARN of your HealthImaging data store.

In addition, you can change the following parameters:

<table>
    <tr>
        <th>section</th>
        <th>Parameter</th>
        <th>Default value</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>ROOT</td>
        <td>CDK_APP_NAME</td>
        <td>metadata-index</td>
        <td>Name of the solution. This name will be use to tag all the resources created by the solution. If you intend to deploy multiple instance of this solution on the same AWS account make sure to change this name for each deployment.</td>
    </tr>
    <tr>
        <td>ROOT</td>
        <td>AHI_DATASTORE_ARN</td>
        <td>""</td>
        <td>The ARN of the AHI datastore for which the metadata should be indexed. The solution will set appropriate privileges for the Lambda parsers to request the metdata.</td>
    </tr>
    <tr>
        <td>RDBMS_CONFIG</td>
        <td>enabled</td>
        <td>False</td>
        <td>Enables the RDBMS index mode. Enabling this will deploy an Aurora serverless MYSQL database and the RDBMS Lambda parser.</td>
    </tr>
    <tr>
        <td>RDBMS_CONFIG</td>
        <td>populate_instance_level</td>
        <td>False</td>
        <td>Specifies if the index should populate the instance level of the DICOM data. if set to `False` only the issuer, patient, study and series tables will be populated.</td>
    </tr>
    <tr>
        <td>RDBMS_CONFIG</td>
        <td>populate_frame_level</td>
        <td>False</td>
        <td>Specifies if the index should populate the frame level of the DICOM data. if set to "True" the instance level will also be populated regardless of the `populate_instance_level` setting.</td>
    </tr>
    <tr>
        <td>RDBMS_CONFIG</td>
        <td>db_name</td>
        <td>ahiindex</td>
        <td>Name of the database.</td>
    </tr>
    <tr>
        <td>RDBMS_CONFIG</td>
        <td>db_engine_pause</td>
        <td>20</td>
        <td>Number of minutes before the Aurora MYSQL goes on sleep if idling. ( no SQL operations done)</td>
    </tr>
    <tr>
        <td>RDBMS_CONFIG</td>
        <td>min_acu_capacity</td>
        <td>1</td>
        <td>Minimum resource allocation for the Aurora MYSQL engine.</td>
    </tr>
    <tr>
        <td>RDBMS_CONFIG</td>
        <td>max_acu_capacity</td>
        <td>16</td>
        <td>Maximum resource allocation for the Aurora MYSQL engine.</td>
    </tr>
    <tr>
        <td>DATALAKE_CONFIG</td>
        <td>enabled</td>
        <td>True</td>
        <td>Enables the Datalake index mode. Enabling this will deploy an S3 bucket if no exisiting bucket is specified, and the Datalake Lambda parser.</td>
    </tr>
    <tr>
        <td>DATALAKE_CONFIG</td>
        <td>populate_instance_level</td>
        <td>True</td>
        <td>Specifies if the index should populate the instance level of the DICOM data. if set to `False` only the issuer, patient, study and series tables will be populated.</td>
    </tr>
    <tr>
        <td>DATALAKE_CONFIG</td>
        <td>destination_bucket_name</td>
        <td>""</td>
        <td>The name of the bucket to be use as the datalake repository. If left empty the solution will create a new bucket for this purpose.</td>
    </tr>
    <tr>
        <td>DATALAKE_CONFIG</td>
        <td>deploy_glue_default_config</td>
        <td>True</td>
        <td>Set to True to deploy a default database, tables and crawler in Glue. This allows for using Athena and QuickSight out of the box. table schemas can be modified in the file datalake_tables_config. Set it to False if you plan on using your own schemas.</td>
    </tr>
    <tr>
        <td>OPENSEARCH_CONFIG</td>
        <td>enabled</td>
        <td>False</td>
        <td>Enable the OpenSearch index mode. THIS MODE IS NOT IMPLEMENTTED YET.</td>
    </tr>
</table>

### Edit `cdk.context.json` file

The `cdk.context.json` is located at: `[project root]/backend/cdk.context.json`.

At a minimum, you must perform the following changes:

1. Set the `ACCOUNT_NUMBER` to the AWS Account ID of your deployment account.
2. Set the `REGION` to the AWS Region of your deployment region.  Default value is `us-east-1`.

In addition, you can change the following parameters:

<table>
    <tr>
        <th>section</th>
        <th>Parameter</th>
        <th>Default value</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>availability-zones</td>
        <td>ACCOUNT_NUMBER</td>
        <td>""</td>
        <td>AWS Account ID of the deployment account.</td>
    </tr>
    <tr>
        <td>availability-zones</td>
        <td>REGION</td>
        <td>us-east-1</td>
        <td>AWS Region for the deployment region.  If you change the default region, please change the list of availability zones to match the changed region.</td>
    </tr>
</table>

## Deploy the `metadata-index` solution

Perform the following instructions to deploy the `metadata-index` solution.

The `cdk deploy` command in the last step takes about 25 to 30 minutes to complete.

Before proceeding with next steps, confirm that the solution deployment completes successfully.

1. From `[project root]/`, create a Python virtual environment on MacOS and Linux:

```
python3 -m venv .venv
```

2. After the init process completes and the Python virtual environment has been created, you can use the following
command to activate your Python virtual environment.

```
source .venv/bin/activate
```

3. If you are on a Windows platform, you should use the following command to activate your Python virtual environment:

```
.venv\Scripts\activate.bat
```

4. Once the Python virtual environment has been activated, navigate to the `[project root]/backend/` folder.

```
cd backend
```

5. Install the required dependencies.

```
pip install -r requirements.txt
```

6. If it is the first time that you are using CDK to deploy in this account and region, bootstrap for CDK deployment:

```
cdk bootstrap
```

7. Use CDK to synthetize and deploy the CloudFormation template for this code.

```
cdk deploy
```

## (Optional) Launch an EC2 Windows Server and install MySQL Workbench

In order to facilitate querying and testing on the Aurora MySQL metadata store, you can optionally deploy a m5.large EC2 Windows Server instance (Microsoft Windows Server 2022 Base) with 30 GB of gp3 storage into `metadata-index-Lambdas-SG` security group, and install MySQL Workbench (version 8.0.41) on the EC2 Windows Server instance.

For instructions, please refer to the
[Get started with EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html) and
[Installing MySQL Workbench on Windows](https://dev.mysql.com/doc/workbench/en/wb-installing-windows.html)
documentation.
