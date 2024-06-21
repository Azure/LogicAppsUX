import type { DataGridProps, TableColumnDefinition, TableColumnSizingOptions } from '@fluentui/react-components';
import {
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
} from '@fluentui/react-components';
import type { Connection } from '@microsoft/logic-apps-shared';
import { getIdLeaf } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useRef } from 'react';
import { useIntl } from 'react-intl';
import type { ConnectionWithFlattenedProperties} from './selectConnection.helpers';
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
      columnId: 'invalid',
      renderHeaderCell: () =>
        intl.formatMessage({
          defaultMessage: 'Invalid',
          id: '7lvqST',
          description: 'Column header for invalid connections',
        }),
      renderCell: (item) => item.invalid,
    }),
    createTableColumn({
      columnId: 'displayName',
      renderHeaderCell: () =>
        intl.formatMessage({
          defaultMessage: 'Display Name',
          id: 'tsmuoF',
          description: 'Column header for connection display name',
        }),
      renderCell: (item) => item.displayName,
    }),
    createTableColumn({
      columnId: 'name',
      renderHeaderCell: () =>
        isXrmConnectionReferenceMode
          ? intl.formatMessage({
              defaultMessage: 'Logical Name',
              id: 'UIWX6p',
              description: 'Column header for connection reference logical name',
            })
          : intl.formatMessage({
              defaultMessage: 'Name',
              id: 'T6VIym',
              description: 'Column header for connection name',
            }),
      renderCell: (item) => item.name,
    }),
    createTableColumn({
      columnId: 'gateway',
      renderHeaderCell: () =>
        intl.formatMessage({
          defaultMessage: 'Gateway',
          id: 'LvpxiA',
          description: 'Column header for connection gateway',
        }),
      renderCell: (item) => item.parameterValues?.gateway?.name,
    }),
  ];

  const columnSizingOptions: TableColumnSizingOptions = {
    invalid: {
      defaultWidth: 40,
      idealWidth: 40,
    },
    displayName: {
      defaultWidth: 200,
      idealWidth: 200,
    },
    name: {
      defaultWidth: 120,
      idealWidth: 120,
    },
    gateway: {
      defaultWidth: 80,
      idealWidth: 80,
    },
  };

  const onSelectionChange: DataGridProps['onSelectionChange'] = useCallback(
    (e: any, data: any) => {
      const index = data.selectedItems.values().next().value;
      if (items[index]?.invalid) {
        return; // Don't allow selection of invalid connections (they are disabled)
      }
      const connection = connections[index];
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
