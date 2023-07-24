// This component can be used to test API calls, etc.

import { Button, Container, ContentLayout, Header, SpaceBetween } from '@cloudscape-design/components';

import { listDatastores } from '../../utils/AwsHealthImagingApi';

export default function Debug() {
    async function getDatastores() {
        const datastores = await listDatastores();
        console.debug('datastores', datastores);
    }
    return (
        <ContentLayout header={<Header variant="h1">Debug</Header>}>
            <Container>
                <SpaceBetween direction="horizontal" size="m">
                    <Button onClick={() => getDatastores()}>Get Datastores</Button>
                </SpaceBetween>
            </Container>
        </ContentLayout>
    );
}
