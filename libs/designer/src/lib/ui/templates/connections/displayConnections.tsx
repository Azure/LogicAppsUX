import type { IColumn, IContextualMenuProps, IDetailsRowProps } from '@fluentui/react';
import {
  ContextualMenuItemType,
  DetailsList,
  DetailsRow,
  Icon,
  IconButton,
  Link,
  SelectionMode,
  Shimmer,
  ShimmerElementType,
  SpinnerSize,
} from '@fluentui/react';
import { Text } from '@fluentui/react-components';
import type { Connection, Template } from '@microsoft/logic-apps-shared';
import { ConnectionService, getObjectPropertyValue, normalizeConnectorId } from '@microsoft/logic-apps-shared';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { getConnectorResources } from '../../../core/templates/utils/helper';
import { type IntlShape, useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { ConnectorIconWithName } from './connector';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { useFunctionalState } from '@react-hookz/web';
import { CreateConnectionInTemplate } from './createConnection';
import React, { useEffect, useState } from 'react';
import { updateTemplateConnection } from '../../../core/actions/bjsworkflow/connections';
import { getConnector } from '../../../core/queries/operation';
import type { ConnectorInfo } from '../../../core/templates/utils/queries';
import { isConnectionValid } from '../../../core/utils/connectors/connections';

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

interface ConnectionItem {
  key: string;
  connectorId: string;
  connectorDisplayName?: string;
  connection?: {
    id: string;
    displayName?: string;
  };
  hasConnection?: boolean;
  allConnections?: Connection[];
}

export interface DisplayConnectionsProps {
  connections: Record<string, Template.Connection>;
}

export const DisplayConnections = ({ connections }: DisplayConnectionsProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const {
    subscriptionId,
    location,
    connections: { references, mapping },
  } = useSelector((state: RootState) => state.workflow);
  const columnsNames = {
    name: intl.formatMessage({ defaultMessage: 'Name', id: 'tRe2Ct', description: 'Column name for connector name' }),
    status: intl.formatMessage({ defaultMessage: 'Status', id: 't7ytOJ', description: 'Column name for connection status' }),
    connection: intl.formatMessage({ defaultMessage: 'Connection', id: 'hlrKDC', description: 'Column name for connection display name' }),
    connectionsList: intl.formatMessage({ defaultMessage: 'Connections list', id: 'w+7aGo', description: 'Connections list' }),
  };
  const [isConnectionInCreate, setConnectionInCreate] = useState(false);
  const [connectionsList, setConnectionsList] = useFunctionalState<ConnectionItem[]>(
    Object.keys(connections).map((key) => ({
      key,
      connectorId: normalizeConnectorId(connections[key].connectorId, subscriptionId, location),
      hasConnection: mapping[key] !== undefined ? true : undefined,
      connection: { id: references[mapping[key]]?.connection?.id, displayName: undefined },
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
    {
      ariaLabel: columnsNames.connectionsList,
      fieldName: '$connectionsList',
      key: '$connectionsList',
      minWidth: 1,
      maxWidth: 10,
      name: '',
    },
  ]);

  const onConnectionsLoaded = async (connections: Connection[], item: ConnectionItem): Promise<void> => {
    const itemHasConnection = item.connection?.id && item.connection?.displayName === undefined;
    const connectionToUse = itemHasConnection ? connections.find((connection) => connection.id === item.connection?.id) : connections[0];
    const hasConnection = connections.length > 0;
    updateItemInConnectionsList(item.key, {
      ...item,
      allConnections: connections,
      hasConnection,
      connection: connectionToUse ? { id: connectionToUse.id, displayName: getConnectionDisplayName(connectionToUse) } : undefined,
    });

    if (!itemHasConnection && connectionToUse) {
      setupTemplateConnection(item.key, item.connectorId, connectionToUse, dispatch);
    }
  };

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
                : (connector: ConnectorInfo) =>
                    updateItemInConnectionsList(item.key, { ...item, connectorDisplayName: connector.displayName })
            }
          />
        );

      case '$status':
        return (
          <ConnectionStatusWithProgress
            item={item}
            intl={intl}
            onConnectionLoaded={(connections) => onConnectionsLoaded(connections, item)}
          />
        );

      case '$connection':
        return <ConnectionName item={item} intl={intl} disabled={isConnectionInCreate} onCreate={handleConnectionCreateClick} />;

      case '$connectionsList':
        return (
          <ConnectionsList
            item={item}
            intl={intl}
            onSelect={(newItem: ConnectionItem) => updateItemInConnectionsList(item.key, newItem)}
            onCreate={handleConnectionCreateClick}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="msla-template-create-tabs">
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
}: { item: ConnectionItem; intl: IntlShape; onConnectionLoaded: (connections: Connection[]) => void }): JSX.Element => {
  const { data } = useConnectionsForConnector(item.connectorId, /* shouldNotRefetch */ true);

  useEffect(() => {
    if (data && item.allConnections === undefined) {
      onConnectionLoaded(data.filter(isConnectionValid));
    }
  }, [data, item.allConnections, onConnectionLoaded]);

  return item.hasConnection !== undefined ? (
    <ConnectionStatus hasConnection={item.hasConnection} intl={intl} />
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

const ConnectionsList = ({
  item,
  intl,
  onSelect,
  onCreate,
}: {
  item: ConnectionItem;
  intl: IntlShape;
  onSelect: (newItem: ConnectionItem) => void;
  onCreate: (item: ConnectionItem) => void;
}): JSX.Element | null => {
  const dispatch = useDispatch<AppDispatch>();
  const { allConnections } = item;
  const existingConnections = React.useMemo(() => {
    return (allConnections ?? []).map((connection) => {
      return {
        key: connection.id,
        text: getConnectionDisplayName(connection),
        data: connection,
      };
    });
  }, [allConnections]);

  if (!allConnections || allConnections.length <= 0) {
    return null;
  }

  const onCreateConnection = () => onCreate(item);
  const onConnectionSelection = (id: string, displayName: string, connection: Connection) => {
    onSelect({
      ...item,
      connection: { id, displayName },
    });

    setupTemplateConnection(item.key, item.connectorId, connection, dispatch);
  };

  const menuProps: IContextualMenuProps = {
    shouldFocusOnMount: true,
    items: [
      ...existingConnections.map(({ key, text, data }) => {
        return {
          key,
          text,
          canCheck: true,
          isChecked: key === item.connection?.id,
          onRenderIcon: () => null,
          onClick: () => onConnectionSelection(key, text, data),
        };
      }),
      { key: 'divider_1', itemType: ContextualMenuItemType.Divider },
      {
        key: '$addConnection',
        iconProps: { iconName: 'Add', style: { marginLeft: '-15px' } },
        name: intl.formatMessage({ defaultMessage: 'Add connection', description: 'Add connection', id: 'Q/V4Uc' }),
        canCheck: false,
        isChecked: false,
        onClick: onCreateConnection,
      },
    ],
  };

  return <IconButton menuIconProps={{ iconName: 'More' }} menuProps={menuProps} className="msla-template-connection-list" />;
};

const setupTemplateConnection = async (key: string, connectorId: string, connection: Connection, dispatch: AppDispatch): Promise<void> => {
  await ConnectionService().setupConnectionIfNeeded(connection);
  const connector = await getConnector(connectorId);
  dispatch(updateTemplateConnection({ connector, connection: connection, nodeId: key }));
};

const getConnectionDisplayName = (connection: Connection): string => {
  return connection.properties.displayName ?? connection.id.split('/').slice(-1)[0];
};

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
