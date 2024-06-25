import type { IColumn, IDetailsRowProps } from '@fluentui/react';
import { DetailsList, DetailsRow, Icon, Link, SelectionMode, Shimmer, ShimmerElementType, SpinnerSize } from '@fluentui/react';
import { Text } from '@fluentui/react-components';
import type { Connection, Connector, Template } from '@microsoft/logic-apps-shared';
import { getObjectPropertyValue } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../../core/state/templates/store';
import { getConnectorResources, normalizeConnectorId } from '../../../core/templates/utils/helper';
import { type IntlShape, useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { ConnectorIconWithName } from './connector';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { useFunctionalState } from '@react-hookz/web';
import { CreateConnectionInTemplate } from '../../panel/templatePanel/createConnection';
import { useState } from 'react';

const createPlaceholderKey = '##create##';
const connectionStatus: Record<string, any> = {
  true: {
    iconName: 'SkypeCircleCheck',
    color: '#57a300',
  },
  false: {
    iconName: 'Blocked2Solid',
    color: '#e00b1ccf',
  },
};
export interface DisplayConnectionsProps {
  connections: Record<string, Template.Connection>;
}

export const DisplayConnections = ({ connections }: DisplayConnectionsProps) => {
  const intl = useIntl();
  const { subscriptionId, location } = useSelector((state: RootState) => state.workflow);
  const columnsNames = {
    name: intl.formatMessage({ defaultMessage: 'Name', id: 'tRe2Ct', description: 'Column name for connector name' }),
    status: intl.formatMessage({ defaultMessage: 'Status', id: 't7ytOJ', description: 'Column name for connection status' }),
    connection: intl.formatMessage({ defaultMessage: 'Connection', id: 'hlrKDC', description: 'Column name for connection display name' }),
  };
  const [isConnectionInCreate, setConnectionInCreate] = useState(false);
  const [connectionsList, setConnectionsList] = useFunctionalState<ConnectionItem[]>(
    Object.keys(connections).map((key) => ({
      key,
      connectorId: normalizeConnectorId(connections[key].connectorId, subscriptionId, location),
    }))
  );

  const _onColumnClick = (_event: React.MouseEvent<HTMLElement>, column: IColumn): void => {
    let isSortedDescending = column.isSortedDescending;

    // If we've sorted this column, flip it.
    if (column.isSorted) {
      isSortedDescending = !isSortedDescending;
    }

    // Sort the items.
    const sortedItems = _copyAndSort(connectionsList(), column.fieldName as string, isSortedDescending);
    setConnectionsList(sortedItems);
    setColumns(
      columns().map((col) => {
        col.isSorted = col.key === column.key;

        if (col.isSorted) {
          col.isSortedDescending = !!isSortedDescending;
        }

        return col;
      })
    );
  };

  const [columns, setColumns] = useFunctionalState<IColumn[]>([
    {
      ariaLabel: columnsNames.name,
      fieldName: '$name',
      key: '$name',
      isResizable: true,
      minWidth: 1,
      name: columnsNames.name,
      maxWidth: 200,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
    {
      ariaLabel: columnsNames.status,
      fieldName: '$status',
      flexGrow: 1,
      key: '$status',
      isResizable: true,
      minWidth: 1,
      maxWidth: 150,
      name: columnsNames.status,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
    {
      ariaLabel: columnsNames.connection,
      fieldName: '$connection',
      flexGrow: 3,
      key: '$connection',
      isResizable: true,
      minWidth: 200,
      name: columnsNames.connection,
      showSortIconWhenUnsorted: true,
      targetWidthProportion: 6,
      onColumnClick: _onColumnClick,
    },
  ]);

  const completeConnectionCreate = (): void => {
    setConnectionInCreate(false);
    setColumns(columns().map((col) => ({ ...col, showSortIconWhenUnsorted: true, onColumnClick: _onColumnClick })));
  };

  const updateItemInConnectionsList = (key: string, item: ConnectionItem) => {
    const newList = connectionsList().map((connection: ConnectionItem) => (connection.key === key ? item : connection));
    setConnectionsList(newList);
  };

  const handleConnectionCancelled = (key: string): void => {
    setConnectionsList(connectionsList().filter((current: ConnectionItem) => current.key !== key));
    completeConnectionCreate();
  };

  const handleConnectionCreate = (item: ConnectionItem, connection: Connection) => {
    const actualItemKey = item.key.replace(createPlaceholderKey, '');
    const newListItems = connectionsList()
      .filter((current: ConnectionItem) => current.key !== item.key)
      .map((current) =>
        current.key === actualItemKey
          ? {
              ...current,
              allConnections: [...(current.allConnections ?? []), connection],
              connection: { id: connection.id, displayName: connection.properties.displayName },
              hasConnection: true,
            }
          : current
      );
    setConnectionsList(newListItems);
    completeConnectionCreate();
  };

  const handleConnectionCreateClick = (item: ConnectionItem) => {
    const newListItems = connectionsList().reduce((result: ConnectionItem[], current: ConnectionItem) => {
      result.push(current);
      if (current.key === item.key) {
        result.push({ ...current, key: `${createPlaceholderKey}${current.key}` });
      }

      return result;
    }, []);

    setConnectionsList(newListItems);
    setColumns(columns().map((col) => ({ ...col, showSortIconWhenUnsorted: false, onColumnClick: undefined })));
    setConnectionInCreate(true);
  };

  const onRenderRow = (props: IDetailsRowProps | undefined) => {
    if (props) {
      const {
        item,
        item: { key, connectorId },
      } = props;
      if (key.startsWith(createPlaceholderKey)) {
        return (
          <CreateConnectionInTemplate
            connectorId={connectorId}
            connectionKey={key.replace(createPlaceholderKey, '')}
            onConnectionCreated={(connection) => handleConnectionCreate(item, connection)}
            onConnectionCancelled={() => handleConnectionCancelled(key)}
          />
        );
      }

      return <DetailsRow {...props} />;
    }
    return null;
  };

  const onRenderItemColumn = (item: ConnectionItem, _index: number | undefined, column: IColumn | undefined) => {
    switch (column?.key) {
      case '$name':
        return (
          <ConnectorIconWithName
            connectorId={item.connectorId}
            classes={{
              root: 'msla-template-create-connector',
              icon: 'msla-template-create-connector-icon',
              text: 'msla-template-create-connector-text',
            }}
            showProgress={true}
            onConnectorLoaded={
              item.connectorDisplayName
                ? undefined
                : (connector: Connector) =>
                    updateItemInConnectionsList(item.key, { ...item, connectorDisplayName: connector.properties.displayName })
            }
          />
        );

      case '$status': {
        return item.allConnections === undefined ? (
          <ConnectionStatusWithProgress
            item={item}
            intl={intl}
            onConnectionLoaded={(connections) => {
              const hasConnection = connections.length > 0;
              updateItemInConnectionsList(item.key, {
                ...item,
                allConnections: connections,
                hasConnection,
                connection: hasConnection ? getConnectionDetails(connections[0]) : undefined,
              });
            }}
          />
        ) : (
          <ConnectionStatus hasConnection={!!item.hasConnection} intl={intl} />
        );
      }

      case '$connection':
        return <ConnectionName item={item} intl={intl} disabled={isConnectionInCreate} onCreate={handleConnectionCreateClick} />;

      default:
        return null;
    }
  };

  return (
    <div className="msla-template-create-tabs">
      <Text className="msla-template-create-tabs-description">
        {intl.formatMessage({
          defaultMessage:
            'Configure connections to authenticate the following services and link your workflows with various services and applications, enabling seamless data integration and automation. Connections are required.',
          id: 'Xld9qI',
          description: 'Message to describe the connections tab',
        })}
      </Text>
      <DetailsList
        setKey="key"
        items={connectionsList()}
        columns={columns()}
        compact={true}
        onRenderRow={onRenderRow}
        onRenderItemColumn={onRenderItemColumn}
        selectionMode={SelectionMode.none}
      />
    </div>
  );
};

const ConnectionStatusWithProgress = ({
  item,
  intl,
  onConnectionLoaded,
}: { item: ConnectionItem; intl: IntlShape; onConnectionLoaded?: (connections: Connection[]) => void }): JSX.Element => {
  const { data } = useConnectionsForConnector(item.connectorId, /* shouldNotRefetch */ true);

  if (data && onConnectionLoaded) {
    onConnectionLoaded(data);
  }

  return data ? (
    <ConnectionStatus hasConnection={data.length > 0} intl={intl} />
  ) : (
    <Shimmer
      className="msla-template-connection-status"
      style={{ width: '70px', marginTop: 8 }}
      shimmerElements={[{ type: ShimmerElementType.line, height: 10, verticalAlign: 'bottom', width: '100%' }]}
      size={SpinnerSize.xSmall}
    />
  );
};

const ConnectionStatus = ({ hasConnection, intl }: { hasConnection: boolean; intl: IntlShape }): JSX.Element => {
  const resources = getConnectorResources(intl);
  const statusText: Record<string, string> = {
    true: resources.connected,
    false: resources.notConnected,
  };
  const key = (!!hasConnection).toString();
  const details = connectionStatus[key];
  return (
    <div className="msla-template-connection-status">
      <Icon style={{ color: details.color }} className="msla-template-connection-status-badge" iconName={details.iconName} />
      <Text className="msla-template-connection-status-text">{hasConnection ? statusText[key] : statusText[key]}</Text>
    </div>
  );
};

const ConnectionName = ({
  item,
  intl,
  disabled,
  onCreate,
}: { item: ConnectionItem; intl: IntlShape; disabled: boolean; onCreate: (item: ConnectionItem) => void }): JSX.Element => {
  const { connection } = item;
  if (connection?.id) {
    return <Text className="msla-template-connection-text">{connection.displayName}</Text>;
  }

  const onCreateConnection = () => {
    onCreate(item);
  };
  return (
    <Link className="msla-template-connection-text" disabled={disabled} onClick={onCreateConnection}>
      {intl.formatMessage({ defaultMessage: 'Connect', description: 'Link to create a connection', id: 'yQ6+nV' })}
    </Link>
  );
};

interface ConnectionItem {
  key: string;
  connectorId: string;
  connectorDisplayName?: string;
  connection?: {
    id: string;
    displayName: string;
  };
  hasConnection?: boolean;
  allConnections?: Connection[];
}

// TODO: Update the connection in store or the reference.
function getConnectionDetails(connection: Connection): { id: string; referenceKey?: string; displayName: string } {
  return {
    id: connection.id,
    displayName: connection.properties.displayName ?? connection.name,
  };
}

function _copyAndSort(items: ConnectionItem[], columnKey: string, isSortedDescending?: boolean): ConnectionItem[] {
  const keyPath =
    columnKey === '$name' ? ['connectorDisplayName'] : columnKey === '$status' ? ['hasConnection'] : ['connection', 'displayName'];
  return items.slice(0).sort((a: ConnectionItem, b: ConnectionItem) => {
    return (
      isSortedDescending
        ? getObjectPropertyValue(a, keyPath) < getObjectPropertyValue(b, keyPath)
        : getObjectPropertyValue(a, keyPath) > getObjectPropertyValue(b, keyPath)
    )
      ? 1
      : -1;
  });
}
