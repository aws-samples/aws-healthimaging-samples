// This component can be used to test API calls, etc.

import { Button, Container, ContentLayout, Header, SpaceBetween } from '@cloudscape-design/components';

import { listDatastores, updateImageSetMetadata } from '../../utils/HealthLakeImagingAPI';

export default function Debug() {
    async function getDatastores() {
        const datastores = await listDatastores();
        console.debug('datastores', datastores);
    }

    async function testUpdate() {
        const updateItem = {
            SchemaVersion: '1.1',
            Patient: {
                DICOM: {
                    PatientID: 'i like turtles',
                    PatientName: 'NEW^LAST^NAME',
                },
            },
        };
        const datastoreId = '7037c9cec803b71b9b0af5cc76eb14b5';
        const imageSetId = '179b51fff9c16bdcfb58a3a00649049e';
        const latestVersionId = '5';

        const updateRsp = await updateImageSetMetadata({
            datastoreId: datastoreId,
            imageSetId: imageSetId,
            latestVersionId: latestVersionId,
            updatableAttributes: updateItem,
        });
        console.debug('updateRsp', updateRsp);
    }

    return (
        <ContentLayout header={<Header variant="h1">Debug</Header>}>
            <Container>
                <SpaceBetween direction="horizontal" size="m">
                    <Button onClick={() => getDatastores()}>Get Datastores</Button>
                    <Button onClick={() => testUpdate()}>Update Metadata</Button>
                </SpaceBetween>
            </Container>
        </ContentLayout>
    );
}
