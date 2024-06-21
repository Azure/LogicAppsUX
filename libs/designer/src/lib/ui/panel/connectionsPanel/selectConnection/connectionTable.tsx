import type { DataGridProps, TableColumnDefinition, TableColumnSizingOptions } from '@fluentui/react-components';
import {
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  PresenceBadge,
  Text,
  Tooltip,
} from '@fluentui/react-components';
import type { Connection } from '@microsoft/logic-apps-shared';
import { getIdLeaf } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useRef } from 'react';
import { useIntl } from 'react-intl';
import { ConnectionTableDetailsButton } from './connectionTableDetailsButton';
import type { ConnectionWithFlattenedProperties } from './selectConnection.helpers';
import { compareFlattenedConnections, flattenConnection } from './selectConnection.helpers';

export interface ConnectionTableProps {
  connections: Connection[];
  currentConnectionId?: string;
  saveSelectionCallback: (connection?: Connection) => void;
  cancelSelectionCallback: () => void;
  createConnectionCallback: () => void;
  isXrmConnectionReferenceMode: boolean;
}

export const ConnectionTable = (props: ConnectionTableProps): JSX.Element => {
  const { connections, currentConnectionId, saveSelectionCallback, cancelSelectionCallback, isXrmConnectionReferenceMode } = props;

  const intl = useIntl();
  const initiallySelectedConnectionId = useRef(currentConnectionId);

  // We need to flatten the connection to allow the detail list access to nested props
  const items = useMemo(
    () =>
      connections.map(flattenConnection).sort((a, b) => {
        if (a.id === initiallySelectedConnectionId.current) {
          return -1;
        }
        if (b.id === initiallySelectedConnectionId.current) {
          return 1;
        }
        return compareFlattenedConnections(a, b);
      }),
    [connections]
  );

  const areIdLeavesEqual = (id1?: string, id2?: string): boolean => getIdLeaf(id1) === getIdLeaf(id2);

  const onConnectionSelect = useCallback(
    (connection: Connection) => {
      if (areIdLeavesEqual(connection.id, currentConnectionId)) {
        cancelSelectionCallback(); // User clicked the existing connection, keep selection the same and return
      } else {
        saveSelectionCallback(connection); // User clicked a different connection, save selection and return
      }
    },
    [cancelSelectionCallback, currentConnectionId, saveSelectionCallback]
  );

  const columns: TableColumnDefinition<ConnectionWithFlattenedProperties>[] = [
    createTableColumn({
      columnId: 'status',
      renderHeaderCell: () =>
        intl.formatMessage({
          defaultMessage: 'Status',
          id: 'qxw9UO',
          description: 'Column header for connection valid/invalid status',
        }),
      renderCell: (item) => {
        const statusText = item.invalid
          ? [...new Set(item.statuses?.map((e) => e.error?.message).filter((m) => !!m))].join(', ')
          : intl.formatMessage({
              defaultMessage: 'Connected',
              id: 'oOGTSo',
              description: 'Connected text',
            });
        return (
          <Tooltip content={statusText} relationship="label">
            <PresenceBadge status={item.invalid ? 'offline' : 'available'} />
          </Tooltip>
        );
      },
    }),
    createTableColumn({
      columnId: 'displayName',
      renderHeaderCell: () =>
        intl.formatMessage({
          defaultMessage: 'Display Name',
          id: 'tsmuoF',
          description: 'Column header for connection display name',
        }),
      renderCell: (item) => {
        const label = item.displayName;
        const subLabel = item.parameterValues?.gateway?.name ?? item.authenticatedUser?.name;
        return (
          <div className="msla-connection-row-display-name">
            <Text block={true} className="msla-connection-row-display-name-label" size={300}>
              {label}
            </Text>
            {subLabel && subLabel !== label ? (
              <Text block={true} className="msla-connection-row-display-name-label" size={200}>
                {subLabel}
              </Text>
            ) : null}
          </div>
        );
      },
    }),
    createTableColumn({
      columnId: 'details',
      renderHeaderCell: () =>
        intl.formatMessage({
          defaultMessage: 'Details',
          id: 'pH6ubt',
          description: 'Column header for accessing connection-related details',
        }),
      renderCell: (item) => <ConnectionTableDetailsButton connection={item} isXrmConnectionReferenceMode={isXrmConnectionReferenceMode} />,
    }),
  ];

  const columnSizingOptions: TableColumnSizingOptions = {
    status: {
      defaultWidth: 40,
      idealWidth: 40,
    },
    displayName: {
      defaultWidth: 420,
      idealWidth: 420,
    },
    details: {
      defaultWidth: 50,
      idealWidth: 50,
    },
  };

  const onSelectionChange: DataGridProps['onSelectionChange'] = useCallback(
    (e: any, data: any) => {
      const index: number = data.selectedItems.values().next().value;
      if (items[index]?.invalid) {
        return; // Don't allow selection of invalid connections (they are disabled)
      }
      const connection = connections.find((c) => items[index].id === c.id);
      if (!connection) {
        return;
      }
      onConnectionSelect(connection);
    },
    [connections, items, onConnectionSelect]
  );

  const currentConnectionIndex = useMemo(() => {
    return items.findIndex((connection) => areIdLeavesEqual(connection.id, currentConnectionId));
  }, [currentConnectionId, items]);

  return (
    <div>
      <DataGrid
        className="msla-connection-table"
        items={items}
        columns={columns}
        selectionMode="single"
        selectedItems={[currentConnectionIndex]}
        onSelectionChange={onSelectionChange}
        columnSizingOptions={columnSizingOptions}
        resizableColumns
        focusMode="row_unstable"
        subtleSelection
        style={{
          border: '1px solid var(--colorNeutralStroke2)',
          borderRadius: '4px',
        }}
      >
        <DataGridHeader>
          <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
        </DataGridHeader>
        <DataGridBody<ConnectionWithFlattenedProperties>>
          {({ item, rowId }) => (
            <DataGridRow<ConnectionWithFlattenedProperties>
              key={rowId}
              selectionCell={{ 'aria-label': 'Select row' }}
              aria-disabled={!!item.invalid}
              style={item.invalid ? { opacity: 0.5 } : undefined}
            >
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  );
};
