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
                        This sample ReactJS-based webapp shows the art of the possible in using AWS HealthImaging to
                        view images.
                    </p>
                    <p>Currently this demo allows you to:</p>
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
                        <li>
                            (Optional) Override the Image Frame endpoint with a proxy (a CloudFront one is available in
                            the repository)
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
                <p>Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.</p>
                <p>
                    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
                    associated documentation files (the "Software"), to deal in the Software without restriction,
                    including without limitation the rights to use, copy, modify, merge, publish, distribute,
                    sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
                    furnished to do so.
                </p>
                <p>
                    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                    NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
                    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
                    OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
                    CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                </p>
            </Box>
        );
    }

    return (
        <ContentLayout header={<Header variant="h2">AWS HealthImaging Sample Viewer</Header>}>
            <Container footer={<Footer />}>
                <Content />
            </Container>
        </ContentLayout>
    );
}

export default memo(Welcome);
