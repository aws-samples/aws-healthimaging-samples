// This is a modal authentication component that displays the AWS Amplify Authenticator.
import { useMemo, useContext, useEffect, memo } from 'react';

// Context
import { AppContext } from '../App';

// Cloudscape
import { Box, Button, Modal, SpaceBetween } from '@cloudscape-design/components';

// AWS
import { Amplify, Hub } from 'aws-amplify';
import { Authenticator, ThemeProvider, defaultDarkModeOverride } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsExports from '../../aws-exports';

Amplify.configure(awsExports);

const authUiComponents = {
    SignUp: {
        Header() {
            return (
                <div
                    style={{
                        textAlign: 'center',
                        paddingTop: '10px',
                        fontStyle: 'italic',
                    }}
                >
                    A verification code will be sent to your email address to validate the account.
                </div>
            );
        },
    },
};

function Auth({ visible, setVisible }) {
    const { appTheme } = useContext(AppContext);

    /**
     * Amplify-UI's <Authentication /> uses 80 for the button, 90 for hover
     * Override to Cloudscape colors - https://cloudscape.design/foundation/visual-foundation/colors/
     * light mode primary : blue-800 #033160
     * light mode hover   : blue-600 #0972d3
     * dark mode primary  : blue-500 #539fe5
     * dark mode hover    : blue-400 #89bdee
     */
    const theme = {
        name: 'AuthTheme',
        overrides: [defaultDarkModeOverride],
        tokens: {
            colors: {
                brand: {
                    primary: {
                        80: appTheme === 'theme.light' ? '#033160' : '#539fe5',
                        90: appTheme === 'theme.light' ? '#0972d3' : '#89bdee',
                        100: appTheme === 'theme.light' ? '#033160' : '#539fe5',
                    },
                },
            },
            components: {
                tabs: {
                    item: {
                        _hover: {
                            color: {
                                value: appTheme === 'theme.light' ? '#0972d3' : '#89bdee',
                            },
                        },
                    },
                },
            },
        },
    };

    const colorMode = useMemo(() => {
        if (appTheme === 'theme.light') {
            return 'light';
        } else if (appTheme === 'theme.dark') {
            return 'dark';
        } else {
            return 'system';
        }
    }, [appTheme]);

    // Show auth modal when token refresh fails
    useEffect(() => {
        Hub.listen('auth', (data) => {
            if (data.payload.event === 'tokenRefresh_failure') {
                setVisible(true);
            }
        });
    }, [setVisible]);

    return (
        <Modal
            onDismiss={() => setVisible(false)}
            visible={visible}
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="link" onClick={() => setVisible(false)}>
                            Cancel
                        </Button>
                    </SpaceBetween>
                </Box>
            }
        >
            <ThemeProvider theme={theme} colorMode={colorMode}>
                <Authenticator components={authUiComponents}>
                    <Box variant="p" textAlign="center">
                        You will be redirected shortly.
                    </Box>
                </Authenticator>
            </ThemeProvider>
        </Modal>
    );
}

export default memo(Auth);
