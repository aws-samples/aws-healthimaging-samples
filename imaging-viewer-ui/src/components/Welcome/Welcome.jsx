import { memo, useContext } from 'react';

// Context
import { AppContext } from '../App';

// App
import isUserAuth from '../../utils/Auth/isUserAuth';

// Cloudscape
import { Alert, Box, Container, ContentLayout, Header, Icon } from '@cloudscape-design/components';

function Welcome() {
    const { user } = useContext(AppContext);

    function Content() {
        if (isUserAuth(user)) {
            return (
                <Box>
                    <p>
                        Welcome to Jyokti viewer to view patient DICOM images
                    </p>
                    <p>Currently the viewer allows you to:</p>
                    <ul>
                        <li>View datastores</li>
                        <li>Search ImageSets</li>
                        <li>View ImageSet metadata</li>
                        <li>
                            View ImageSets with the following methods:
                            <ul>
                                <li>Default: load, decode and view full image frames</li>
                                <li>Progressive: load, decode and view image frames chunks at a time</li>
                                <li>
                                    TLM: load, decode and view image frames one tile level marker level at a time
                                    (requires a TLM proxy, available in the repository)
                                </li>
                            </ul>
                        </li>
                    </ul>
                    <p>
                        At any point, select the information icon <Icon name="status-info" /> on the top right of this
                        page for more information.
                    </p>
                </Box>
            );
        } else {
            return <Alert>Log in for full functionality.</Alert>;
        }
    }

    function Footer() {
        return (
            <Box textAlign="center" color="text-body-info" fontSize="body-s">
                <p>Copyright Jyokti.com, Inc. All Rights Reserved.</p>
            </Box>
        );
    }

    return (
        <ContentLayout header={<Header variant="h2">Jyokti Sample Viewer</Header>}>
            <Container footer={<Footer />}>
                <Content />
            </Container>
        </ContentLayout>
    );
}

export default memo(Welcome);
