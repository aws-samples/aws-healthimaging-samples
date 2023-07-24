// These items are used in the SideNavigation component in <App />

const sideNavItems = [
    { type: 'link', text: 'Home', href: '/' },
    {
        type: 'link',
        text: 'Data Stores',
        href: '/datastores',
    },
    {
        type: 'link',
        text: 'Search',
        href: '/search',
    },
    {
        type: 'link',
        text: 'Metadata',
        href: '/metadata',
    },
    {
        type: 'link',
        text: 'Image Viewer',
        href: '/viewer',
    },
    { type: 'divider' },
    {
        type: 'link',
        text: 'Settings',
        href: '/settings',
    },
    { type: 'divider' },
    {
        type: 'link',
        text: 'Amazon HeathLake Imaging',
        href: 'https://aws.amazon.com/healthimaging',
        external: true,
    },
    {
        type: 'link',
        text: 'AWS Amplify',
        href: 'https://aws.amazon.com/amplify',
        external: true,
    },
    {
        type: 'link',
        text: 'CornerstoneJS',
        href: 'https://www.cornerstonejs.org',
        external: true,
    },
    {
        type: 'link',
        text: 'HTJ2K',
        href: 'https://htj2k.com',
        external: true,
    },
];

export { sideNavItems };
