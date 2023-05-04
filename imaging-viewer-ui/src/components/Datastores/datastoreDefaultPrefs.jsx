// Cloudscape
import { Button, Link, Popover, Spinner, StatusIndicator, TextContent } from '@cloudscape-design/components';

// Clipboardy
import clipboard from 'clipboardy';

// App
import { displayUnixDate } from '../../utils/DateTime';
import './datastores.css';

export function cardDefinitions(navigate) {
    return {
        header: (d) => (
            <>
                {d.datastoreStatus !== 'DELETED' ? (
                    <Link onFollow={() => navigate(`/datastores/${d.datastoreId}`)} fontSize="heading-s">
                        {d.datastoreName}
                    </Link>
                ) : (
                    <TextContent className="deleted-card-header-text-content">
                        <p>
                            <strong>{d.datastoreName}</strong>
                        </p>
                    </TextContent>
                )}
                <Popover
                    triggerType="custom"
                    dismissButton={false}
                    content={
                        d.datastoreArn ? (
                            <StatusIndicator type="success">Data store ARN copied to clipboard</StatusIndicator>
                        ) : (
                            <StatusIndicator type="warning">Data store ARN not found</StatusIndicator>
                        )
                    }
                >
                    <Button
                        variant="icon"
                        iconName="copy"
                        disabled={!d.datastoreArn}
                        onClick={() => {
                            clipboard.write(d.datastoreArn);
                        }}
                    />
                </Popover>
            </>
        ),
        sections: [
            {
                id: 'datastoreId',
                header: 'ID',
                content: (d) => d.datastoreId,
            },
            {
                id: 'createdAt',
                header: 'Created',
                content: (d) => displayUnixDate(d.createdAt),
            },
            {
                id: 'datastoreStatus',
                header: 'Status',
                content: (d) =>
                    ['CREATING', 'DELETING'].includes(d.datastoreStatus) ? (
                        <div>
                            {d.datastoreStatus}
                            <Spinner />
                        </div>
                    ) : (
                        d.datastoreStatus
                    ),
            },
            {
                id: 'datastoreArn',
                header: 'ARN',
                content: (d) => d.datastoreArn,
            },
            {
                id: 'updatedAt',
                header: 'Updated At',
                content: (d) => displayUnixDate(d.updatedAt),
            },
        ],
    };
}

export const VISIBLE_CONTENT_OPTIONS = [
    {
        label: 'Data store properties',
        options: [
            { id: 'datastoreId', label: 'Data store ID' },
            { id: 'datastoreArn', label: 'Data store ARN' },
            { id: 'datastoreStatus', label: 'Data store status' },
            { id: 'createdAt', label: 'Created at' },
            { id: 'updatedAt', label: 'Updated at' },
        ],
    },
];

export const PAGE_SIZE_OPTIONS = [
    { value: 6, label: '6 Data Stores' },
    { value: 12, label: '12 Data Stores' },
    { value: 18, label: '18 Data Stores' },
];

export const DEFAULT_PREFERENCES = {
    pageSize: 6,
    visibleContent: ['datastoreId', 'createdAt', 'datastoreStatus'],
};
