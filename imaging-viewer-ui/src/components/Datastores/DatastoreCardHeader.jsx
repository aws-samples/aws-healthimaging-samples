// Cloudscape
import { Button, Header, SpaceBetween, Toggle } from '@cloudscape-design/components';

export default function CardHeader(showDeleted, setShowDeleted, getDatastores) {
    return (
        <Header
            actions={
                <SpaceBetween direction="horizontal" size="xs">
                    <div
                        style={{
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Toggle
                            style={{ verticalAlign: 'baseline' }}
                            onChange={({ detail }) => {
                                setShowDeleted(detail.checked);
                            }}
                            checked={showDeleted}
                        >
                            Show Deleted Data Stores
                        </Toggle>
                    </div>
                    <Button
                        iconAlign="left"
                        iconName="refresh"
                        onClick={() => {
                            getDatastores();
                        }}
                    >
                        Refresh
                    </Button>
                </SpaceBetween>
            }
        >
            Data Stores
        </Header>
    );
}
