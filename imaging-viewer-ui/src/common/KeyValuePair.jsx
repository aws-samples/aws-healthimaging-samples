import { Box } from '@cloudscape-design/components';

export default function KeyValuePair({ label, children, center = true, variant = 'vertical' }) {
    let labelBoxparams = {};
    let childrenBoxParams = {};
    if (variant === 'horizontal') {
        labelBoxparams = { display: 'inline', padding: { right: 'xs' } };
        childrenBoxParams = { display: 'inline' };
    }

    let textAlignParams = {};
    if (center) textAlignParams = { textAlign: 'center' };
    
    return (
        <div>
            <Box variant="awsui-key-label" {...textAlignParams} {...labelBoxparams}>
                {label}
            </Box>
            <Box {...textAlignParams} {...childrenBoxParams}>
                {children}
            </Box>
        </div>
    );
}
