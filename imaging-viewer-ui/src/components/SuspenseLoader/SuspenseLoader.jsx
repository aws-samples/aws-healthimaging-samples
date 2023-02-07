import { Box, Spinner } from '@cloudscape-design/components';

export default function SuspenseLoader() {
    return (
        <Box textAlign={'center'} margin={'xl'}>
            <Spinner size={'large'} />
        </Box>
    );
}
