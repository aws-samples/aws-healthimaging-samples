# Deployment

This project deploys as a standard CDK project. The following instructions will help you deploy the solution in your AWS account.

## Prerequisites

You will need the following software packages installed locally to deploy this solution in AWS Cloud.

**Python3/pip:**<br>The deployment automation code is written in Python.

**CDK:**<br>Please refer to CDK documentation to install the framework and bootstrap your AWS environment.

**Docker:**<br>When running the CDK deploy command, the container images will automatically be built (via docker build command), and sent to AWS ECR registry. Docker must be present on the machine where the cdk deployment is executed. Docker desktop is sufficient. Refer to Docker Desktop documentation to install it on your machine.

**Compatible region:**<br>As of 09/01/203 this project is compatible in the following regions: US East (N. Virginia), US West (Oregon), Asia Pacific (Sydney), and Europe (Ireland).




## project configuration
The project configuration is in the file `[project root]/backend/config.py`. You can change the following parameters:
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
        <td>ahi-index</td>
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



## Installation
1 - Navigate to the `/backend/` folder.
```
$ cd backend
```

2 - To manually create a virtualenv on MacOS and Linux:

```
$ python3 -m venv .venv
```

3 - After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
$ source .venv/bin/activate
```

4 - If you are a Windows platform, you would activate the virtualenv like this:

```
% .venv\Scripts\activate.bat
```

5 - Once the virtualenv is activated, you can install the required dependencies.

```
$ pip install -r requirements.txt
```

6 - At this point you can now synthetize and deploy the CloudFormation template for this code.

```
$ cdk deploy
```
