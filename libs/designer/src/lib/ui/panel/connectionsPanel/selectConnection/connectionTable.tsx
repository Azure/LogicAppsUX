import { Icon, TooltipHost } from '@fluentui/react';
import type { DataGridProps, TableColumnDefinition, TableColumnSizingOptions } from '@fluentui/react-components';
import {
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  createTableColumn,
} from '@fluentui/react-components';
import type { Connection } from '@microsoft/logic-apps-shared';
import { getConnectionErrors, getIdLeaf } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';

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

  // We need to flatten the connection to allow the detail list access to nested props
  const items = useMemo(
    () =>
      connections.map((connection) => {
        const errors = getConnectionErrors(connection);
        return {
          ...connection,
          ...connection.properties,
          // 'invalid' being truthy is being used to determine whether the details list row is disabled
          invalid:
            errors.length > 0 ? (
              <div className="msla-connection-error-icon-container">
                <TooltipHost content={errors.map((error) => error.error?.message).join(', ')}>
                  <Icon iconName="Error" className="msla-connection-error-icon" styles={{ root: { color: '#e00202' } }} />
                </TooltipHost>
              </div>
            ) : null,
        };
      }),
    [connections]
  );
  type ConnectionWithFlattenedProperties = (typeof items)[0];

  const areIdLeavesEqual = (id1?: string, id2?: string): boolean => getIdLeaf(id1) === getIdLeaf(id2);

  const onConnectionSelect = useCallback(
    (connection: Connection) => {
      if (!areIdLeavesEqual(connection.id, currentConnectionId))
        saveSelectionCallback(connection); // User clicked a different connection, save selection and return
      else cancelSelectionCallback(); // User clicked the existing connection, keep selection the same and return
    },
    [cancelSelectionCallback, currentConnectionId, saveSelectionCallback]
  );

  const columns: TableColumnDefinition<ConnectionWithFlattenedProperties>[] = [
    createTableColumn<any>({
      columnId: 'invalid',
      renderHeaderCell: () =>
        intl.formatMessage({
          defaultMessage: 'Invalid',
          description: 'Column header for invalid connections',
        }),
      renderCell: (item) => item.invalid,
    }),
    createTableColumn<any>({
      columnId: 'displayName',
      renderHeaderCell: () =>
        intl.formatMessage({
          defaultMessage: 'Display Name',
          description: 'Column header for connection display name',
        }),
      renderCell: (item) => item.displayName,
    }),
    createTableColumn<any>({
      columnId: 'name',
      renderHeaderCell: () =>
        isXrmConnectionReferenceMode
          ? intl.formatMessage({
              defaultMessage: 'Logical Name',
              description: 'Column header for connection reference logical name',
            })
          : intl.formatMessage({
              defaultMessage: 'Name',
              description: 'Column header for connection name',
            }),
      renderCell: (item) => item.name,
    }),
    createTableColumn<any>({
      columnId: 'gateway',
      renderHeaderCell: () =>
        intl.formatMessage({
          defaultMessage: 'Gateway',
          description: 'Column header for connection gateway',
        }),
      renderCell: (item) => item.gateway,
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
      if (items[index]?.invalid) return; // Don't allow selection of invalid connections (they are disabled)
      const connection = connections[index];
      if (!connection) return;
      onConnectionSelect(connection);
    },
    [connections, items, onConnectionSelect]
  );

  const currentConnectionIndex = useMemo(() => {
    return items.findIndex((connection) => areIdLeavesEqual(connection.id, currentConnectionId));
  }, [currentConnectionId, items]);

  return (
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
      <DataGridBody<any>>
        {({ item, rowId }) => (
          <DataGridRow<any>
            key={rowId}
            selectionCell={{ 'aria-label': 'Select row' }}
            aria-disabled={!!item.invalid}
            style={item.invalid && { opacity: 0.5 }}
          >
            {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
          </DataGridRow>
        )}
      </DataGridBody>
    </DataGrid>
  );
};
