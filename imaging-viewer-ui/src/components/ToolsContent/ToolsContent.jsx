// React
import { useContext } from 'react';

// Context
import { AppContext } from '../App';

// App
import isUserAuth from '../../utils/Auth/isUserAuth';

// Cloudscape
import { Box, ExpandableSection, HelpPanel, Icon, Link } from '@cloudscape-design/components';

// Router
import { useLocation } from 'react-router-dom';

export default function ToolsContent() {
    const { user } = useContext(AppContext);
    const location = useLocation();

    const defaultHeader = (
        <Box variant="h3" textAlign="center">
            Jyokti Viewer
        </Box>
    );

    if (!isUserAuth(user)) {
        return <HelpPanel header={defaultHeader}>Log in for full functionality.</HelpPanel>;
    }

    function Footer({ additionalLinks = [] }) {
        return (
            <div>
                <h3>Learn more</h3>
                <Link external href="https://www.jyokti.com">
                    Jyokti
                </Link>
                {additionalLinks.map((l) => (
                    <p key={l.name}>
                        <Link external href={l.url}>
                            {l.name}
                        </Link>
                    </p>
                ))}
            </div>
        );
    }

    const defaultContent = (
        <div>
            <p>Welcome to Jyokti Viewer </p>
            <p>
                Explore using the navigation menu on the left side of the page. This pane provides contextually-aware
                information on each app component.
            </p>
            <p>
                Select the right arrow <Icon name="angle-right" /> above to hide this pane.
            </p>
        </div>
    );

    if (location.pathname === '/') {
        return (
            <HelpPanel header={defaultHeader} footer={<Footer />}>
                {defaultContent}
            </HelpPanel>
        );
    } else if (/^\/datastores(\/\w+)?$/.test(location.pathname)) {
        return (
            <HelpPanel
                header={<h2>Datastores</h2>}
            >
                <div>
                    <p>
                        A data store provides logical separation of imaging data. This enables multi-tenant use cases.
                    </p>
                </div>
            </HelpPanel>
        );
    }  else if (location.pathname === '/search') {
        return (
            <HelpPanel header={<h2>ImageSet Search</h2>} footer={<Footer />}>
                <div>
                    <p>
                        Jyokti viewer service provides native search functionality. You can search in a
                        datastore by the following parameters:
                    </p>
                    <ul>
                        <li>Patient ID</li>
                        <li>Accession Number</li>
                        <li>Study ID</li>
                        <li>Study Instance UID</li>
                        <li>Study Date</li>
                    </ul>
                    <p>Only one parameter can be specified at a time.</p>
                    <p>
                        Alternatively, you can use an event-drive architecture to search based off of ImageSet metadata
                        JSON.
                    </p>
                </div>
            </HelpPanel>
        );
    } else if (location.pathname === '/metadata') {
        return (
            <HelpPanel header={<h2>ImageSet Metadata</h2>} footer={<Footer />}>
                <div>
                    <p>Jyokti viewer provides an optimized JSON representation of an ImageSet's metadata.</p>
                    <p>This includes patient, study, series and instance-level data.</p>
                </div>
            </HelpPanel>
        );
    } else if (location.pathname === '/viewer') {
        return (
            <HelpPanel
                header={<h2>ImageSet Viewer</h2>}
                footer={
                    <Footer
                        additionalLinks={[
                            {
                                name: 'HTJ2K',
                                url: 'https://htj2k.com',
                            },
                        ]}
                    />
                }
            >
                <div>
                    <p>
                        Jyokti viewer stores and provides image frames in lossless High Throughput JPEG 2000 (HTJ2K)
                        format. HTJ2K is a simple extension to the existing JPEG2000 standard that replaces block coder
                        resulting in an order of magnitude speedup.
                    </p>
                    <p>
                        This component uses{' '}
                        <Link external href="https://github.com/chafey/openjphjs">
                            openjphjs
                        </Link>{' '}
                        to decode the HTJ2K image frames and{' '}
                        <Link external href="https://github.com/cornerstonejs/cornerstone">
                            cornerstone.js
                        </Link>{' '}
                        to display the images.
                    </p>
                    <ExpandableSection header="Loading Methods">
                        <p>
                            <strong>Default: </strong>
                            Using webworkers, request each image frame. After each frame is retrieved, decode and
                            display the image frame.
                        </p>
                        <p>
                            <strong>Progressive: </strong>
                            Using webworkers, request each image frame and read it chunk by chunk. After each chunk is
                            read, append it to the previous chunks for a partial object. The partial objects are decoded
                            and displayed until the entire image frame is read.
                        </p>
                        <p>
                            <strong>Tile Level Markers: </strong>
                            Using webworkers, request each image frame start withing Tile Level Marker (TLM) level 0.
                            This initial small object represents a discrete resolution representation of the image
                            frame, and is useful for specific workloads, such as thumbnails. This object is decoded and
                            displayed. Subsequent TLM levels are requested, appended to the initial object, then decoded
                            and displayed. This method requires a TLM proxy. Configure using the settings icon by the
                            Reset button.
                        </p>
                    </ExpandableSection>
                    <ExpandableSection header="Settings">
                        <strong>Tile Level Marker Proxy</strong>
                        <p>
                            This proxy can be deployed from the tile-level-marker-proxy project in the code repository.
                            Provide the full public URL in the settings and the authorization mode to enable TLM
                            loading.
                        </p>
                        <strong>Image Frame Endpoint Override</strong>
                        <p>
                            This endpoint will override where the viewer retrieves image frames. One such example is
                            using a content deliver network, Amazon CloduFront, using the amazon-cloudfront-delivery
                            project in the code repository. Provide the full public URL in the settings and the
                            authorization mode to use this feature.
                        </p>
                    </ExpandableSection>
                </div>
            </HelpPanel>
        );
    } else {
        return (
            <HelpPanel header={defaultHeader} footer={<Footer />}>
                {defaultContent}
            </HelpPanel>
        );
    }
}
