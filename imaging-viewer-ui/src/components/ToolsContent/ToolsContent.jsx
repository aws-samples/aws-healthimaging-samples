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
            AWS HealthImaging Sample Viewer
        </Box>
    );

    if (!isUserAuth(user)) {
        return <HelpPanel header={defaultHeader}>Log in for full functionality.</HelpPanel>;
    }

    function Footer({ additionalLinks = [] }) {
        return (
            <div>
                <h3>Learn more</h3>
                <Link external href="https://aws.amazon.com/healthimaging">
                    AWS HealthImaging
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
            <p>Welcome to the sample app! </p>
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
                footer={
                    <Footer
                        additionalLinks={[
                            {
                                name: 'AWS Tagging',
                                url: 'https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html',
                            },
                            {
                                name: 'Role Based Access Control',
                                url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html',
                            },
                            {
                                name: 'Attribute Based Access Control',
                                url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html',
                            },
                        ]}
                    />
                }
            >
                <div>
                    <p>
                        A data store provides logical separation of imaging data. This enables multi-tenant use cases.
                    </p>
                    <p>
                        Datastores are assigned Amazon Resource Names (ARNs) and can be tagged with keys and values.
                        This enables fine-grained access controls across organizations using role-based access control
                        (RBAC) and/or attribute-based access control (ABAC). Tags can also be used for cost allocation.
                    </p>
                </div>
            </HelpPanel>
        );
    } else if (/^\/datastores\/\w+\/tags$/.test(location.pathname)) {
        return (
            <HelpPanel
                header={<h2>Datastore Tags</h2>}
                footer={
                    <Footer
                        additionalLinks={[
                            {
                                name: 'AWS Tagging',
                                url: 'https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html',
                            },
                            {
                                name: 'Role Based Access Control',
                                url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html',
                            },
                            {
                                name: 'Attribute Based Access Control',
                                url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html',
                            },
                        ]}
                    />
                }
            >
                <div>
                    <p>
                        Tags are words or phrases that you can use to identify and organize your AWS resources. You can
                        add multiple tags to each resource, and each tag includes a key and a value that you define. For
                        example, the key might be "domain" and the value might be "example.com". You can search and
                        filter your resources based on the tags you add.
                    </p>
                </div>
            </HelpPanel>
        );
    } else if (location.pathname === '/search') {
        return (
            <HelpPanel header={<h2>ImageSet Search</h2>} footer={<Footer />}>
                <div>
                    <p>
                        The AWS HealthImaging service provides native search functionality. You can search in a
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
                    <p>AWS HealthImaging provides an optimized JSON representation of an ImageSet's metadata.</p>
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
                        AWS HealthImaging stores and provides image frames in lossless High Throughput JPEG 2000 (HTJ2K)
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
