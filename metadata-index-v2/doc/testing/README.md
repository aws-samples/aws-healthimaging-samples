# Testing Instructions

In this section, we walk through how to:

1. Download and upload sample DICOM datasets to input Amazon S3 bucket;
2. Generate `Image Set Created` events and trigger the creation of metadata in the metadata store.
3. Generate ``Image Set Updated`` events and trigger the update of metadata in the metadata store. 

## Download and upload sample DICOM datasets to input Amazon S3 bucket

Follow the instructions in the [sample DICOM datasets](https://catalog.workshops.aws/introduction-to-medical-imaging/en-US/020-lab2/010-sample-data-set) lab from the
[Introduction to AWS HealthImaging](https://catalog.workshops.aws/introduction-to-medical-imaging/en-US) workshop
to download and upload the datasets into an input Amazon S3 bucket of your choice.

Before proceeding with next steps, confirm that the sample DICOM datasets are uploaded into your input Amazon S3 bucket.

## Generate `Image Set Created` events and trigger the creation of metadata in the metadata store

As your first test, you will use a HealthImaging DICOM import job to generate `Image Set Created` events, and trigger the creation of metadata in the Aurora MySQL metadata store. 

With the sample DICOM datasets in the input S3 bucket, follow the instructions in the [Import Sample Dataset](https://catalog.workshops.aws/introduction-to-medical-imaging/en-US/020-lab2/020-import-sample-data) lab
to start a HealthImaging DICOM import job with the `CTStudy` dataset.

In order to facilitate testing, you can create an [EventBridge with HealthImaging](https://docs.aws.amazon.com/healthimaging/latest/devguide/event-notifications.html) rule `example-rule-for-healthimaging-events`
that writes all HealthImaging events to the CloudWatch group `/aws/events/healthimaging-events`.

Navigate to **CloudWatch** > **Log groups** > **/aws/events/healthimaging-events**.
As shown in Figures 6 and 7, you should find two log streams, one for each `Image Set Created` event and image set id.

Figure 6: `Image Set Created` Event for HealthImaging Image Set 1.

Figure 7: `Image Set Created` Event for HealthImaging Image Set 2.

At the same time, the EventBridge rule for the Aurora MySQL metadata store `metadata-index-v2-ahitordbmsrule` writes two `Image Set Created` events as messages into the Amazon SQS queue `metadata-index-v2-ahi-to-rdbms-queue`.
The arrival of messages triggers the invocation of the Lambda function `metadata-index-v2-ahitordbms`. 

As shown in Figure 8, the two `Image Set Created` messages arrived more than the batch window size of 2 seconds apart.  Therefore, although the Lambda function’s SQS queue trigger has a batch size of 40, the two messages results in two separate invocations of the Lambda function.

Figure 8: Two `Image Set Created` messages are more than batch window size apart.  This results in two separate invocations of the `metadata-index-v2-ahitordbms` Lambda function.

Next, use RDP client to sign into the EC2 Windows Server instance, and launch MySQL Workbench.
Open the MySQL connection for the ahiindex database.

As shown in Figure 9, you can query the following tables, and should see the following record counts (as outlined in the orange colored frame):

* patient : 1 record (`MISTER^CT`)
* study : 1 record (`CHEST`)
* series : 2 records (`SCOUT`, `HELICAL CHEST`)
* instances : 111 records (`SCOUT`: 2 records; `HELICAL CHEST`: 109 records)

Figure 9: Use MySQL Workbench to query `ahiindex` tables after processing `Image Set Created` messages.

Before proceeding with next steps, confirm that the Aurora MySQL metadata store contains the `CTStudy` metadata records.

## Generate ``Image Set Updated`` events and trigger the update of metadata in the metadata store

As our next test, we will use the `aws medical-imaging update-image-set-metadata` command to generate `Image Set Updated` events, and trigger the update of metadata in the Aurora MySQL metadata store.

With the `CTStudy` metadata in the Aurora MySQL metadata store, from your deployment environment, follow the instructions in the Update Image Set Metadata lab to change the patient name from `MISTER^CT` to `ANON^ANON`.

Navigate to **CloudWatch** > **Log groups** > **/aws/events/healthimaging-events**.
As shown in Figures 10 and 11, you should find two log streams, one for each `Image Set Updated` event and image set id.

Figure 10: `Image Set Updated` Event for HealthImaging Image Set 1.

Figure 11: `Image Set Updated` Event for HealthImaging Image Set 2.

At the same time, the EventBridge rule for the Aurora MySQL metadata store `metadata-index-v2-ahitordbmsrule` writes two `Image Set Updated` events as messages into the Amazon SQS queue `metadata-index-v2-ahi-to-rdbms-queue`. The arrival of messages triggers the invocation of the Lambda function `metadata-index-v2-ahitordbms`.

As shown in Figure 12, the two `Image Set Updated` messages arrived more than the batch window size of 2 seconds apart.  Therefore, although the Lambda function’s SQS queue trigger has a batch size of 40, the two messages results in two separate invocations of the Lambda function.

Figure 12: Two `Image Set Updated` messages are more than batch window size apart.  This results in two separate invocations of the `metadata-index-v2-ahitordbms` Lambda function.

Next, use RDP client to sign into the EC2 Windows Server instance, and launch MySQL Workbench. Open the MySQL connection for the ahiindex database.

As shown in Figure 13, you can query the following tables, and should see the following record counts (as outlined in the orange colored frame):

* patient : 1 record (`ANON^ANON`)
* study : 1 record (`CHEST`)
* series : 2 records (`SCOUT`, `HELICAL CHEST`)
* instances : 111 records (`SCOUT`: 2 records; `HELICAL CHEST`: 109 records)

Figure 13: Use MySQL Workbench to query `ahiindex` tables after processing `Image Set Updated` messages.

Note that patient_name has changed from `MISTER^CT` to `ANON^ANON`.  Everything else remains the same.
