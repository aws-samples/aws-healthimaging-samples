import { Box } from '@cloudscape-design/components';

export default function KeyValuePair({ label, children, variant = 'vertical' }) {
    let labelBoxparams = {};
    let childrenBoxParams = {};
    if (variant === 'horizontal') {
        labelBoxparams = { display: 'inline', padding: { right: 'xs' } };
        childrenBoxParams = { display: 'inline' };
    }

    return (
        <div>
            <Box variant="awsui-key-label" textAlign="center" {...labelBoxparams}>
                {label}
            </Box>
            <Box textAlign="center" {...childrenBoxParams}>
                {children}
            </Box>
        </div>
    );
}
