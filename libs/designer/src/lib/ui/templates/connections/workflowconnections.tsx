import type { IColumn, IContextualMenuProps, IDetailsRowProps, IGroup } from '@fluentui/react';
import {
  ContextualMenuItemType,
  DetailsList,
  DetailsRow,
  Icon,
  IconButton,
  SelectionMode,
  Shimmer,
  ShimmerElementType,
  SpinnerSize,
} from '@fluentui/react';
import { Link, Text } from '@fluentui/react-components';
import type { Connection, Template } from '@microsoft/logic-apps-shared';
import { aggregate, ConnectionService, getObjectPropertyValue, guid, normalizeConnectorId } from '@microsoft/logic-apps-shared';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { getConnectorResources } from '../../../core/templates/utils/helper';
import { type IntlShape, useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { ConnectorIconWithName } from './connector';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { useFunctionalState } from '@react-hookz/web';
import { CreateConnectionInTemplate } from './createConnection';
import React, { useEffect, useMemo, useState } from 'react';
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
  id: string;
  workflowId: string;
  connectionKey: string;
  connectorId: string;
  connectorDisplayName?: string;
  connection?: {
    id: string;
    displayName?: string;
  };
  hasConnection?: boolean;
  allConnections?: Connection[];
}

export interface WorkflowConnectionsProps {
  connections: Record<string, Template.Connection>;
}

export const WorkflowConnections = ({ connections }: WorkflowConnectionsProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const {
    subscriptionId,
    location,
    connections: { references, mapping },
    workflows,
    viewTemplateDetails,
  } = useSelector((state: RootState) => ({
    subscriptionId: state.workflow.subscriptionId,
    location: state.workflow.location,
    connections: state.workflow.connections,
    workflows: state.template.workflows,
    viewTemplateDetails: state.templateOptions.viewTemplateDetails,
  }));
  const columnsNames = {
    name: intl.formatMessage({ defaultMessage: 'Name', id: 'tRe2Ct', description: 'Column name for connector name' }),
    status: intl.formatMessage({ defaultMessage: 'Status', id: 't7ytOJ', description: 'Column name for connection status' }),
    connection: intl.formatMessage({ defaultMessage: 'Connection', id: 'hlrKDC', description: 'Column name for connection display name' }),
    connectionsList: intl.formatMessage({ defaultMessage: 'Connections list', id: 'w+7aGo', description: 'Connections list' }),
  };
  const isSingleWorkflow = useMemo(() => Object.keys(workflows).length === 1, [workflows]);
  const [isConnectionInCreate, setConnectionInCreate] = useState(false);
  const [connectionsList, setConnectionsList] = useFunctionalState<ConnectionItem[]>(
    aggregate(
      Object.values(workflows).map((workflow) =>
        workflow.connectionKeys.map((key) => {
          const connectionItem = connections[key];

          return {
            id: guid(),
            workflowId: workflow.id,
            connectionKey: key,
            connectorId: normalizeConnectorId(connectionItem.connectorId, subscriptionId, location),
            hasConnection: mapping[key] !== undefined ? true : undefined,
            connection: { id: references[mapping[key]]?.connection?.id, displayName: undefined },
          };
        })
      )
    )
  );

  const _onColumnClick = (_event: React.MouseEvent<HTMLElement>, column: IColumn): void => {
    let isSortedDescending = column.isSortedDescending;

    // If we've sorted this column, flip it.
    if (column.isSorted) {
      isSortedDescending = !isSortedDescending;
    }

    // Sort the items.
    const sortedItems = copyAndSort(connectionsList(), column.fieldName as string, isSortedDescending);
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
      minWidth: 300,
      name: columnsNames.name,
      maxWidth: 350,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
    {
      ariaLabel: columnsNames.status,
      fieldName: '$status',
      key: '$status',
      isResizable: true,
      minWidth: 150,
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
      maxWidth: 250,
      name: columnsNames.connection,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
    {
      ariaLabel: columnsNames.connectionsList,
      fieldName: '$connectionsList',
      key: '$connectionsList',
      minWidth: 10,
      maxWidth: 10,
      name: '',
    },
  ]);

  useEffect(() => {
    if (!isSingleWorkflow) {
      setColumns(columns().map((col) => ({ ...col, showSortIconWhenUnsorted: false, onColumnClick: undefined })));
    }
  }, [columns, isSingleWorkflow, setColumns]);

  const [groups, setGroups] = useFunctionalState<IGroup[]>(
    Object.values(workflows).map((workflow) => ({
      key: workflow.id,
      name: workflow.manifest?.title ?? workflow.workflowName ?? workflow.id,
      level: 0,
      startIndex: connectionsList().findIndex((item) => item.workflowId === workflow.id),
      count: workflow.connectionKeys.length,
    }))
  );

  const onConnectionsLoaded = async (loadedConnections: Connection[], item: ConnectionItem): Promise<void> => {
    const connectionIdToOverride = viewTemplateDetails?.connectionsOverride?.[item.connectionKey]?.connectionId;
    const itemHasConnection = item.connection?.id && item.connection?.displayName === undefined;
    const connectionToUse = itemHasConnection
      ? loadedConnections.find((connection) => connection.id === item.connection?.id)
      : connectionIdToOverride
        ? loadedConnections.find((connection) => connection.id === connectionIdToOverride)
        : loadedConnections[0];
    const hasConnection = loadedConnections.length > 0;
    updateItemInConnectionsList({
      ...item,
      allConnections: loadedConnections,
      hasConnection,
      connection: connectionToUse ? { id: connectionToUse.id, displayName: getConnectionDisplayName(connectionToUse) } : undefined,
    });

    if (!itemHasConnection && connectionToUse) {
      setupTemplateConnection(item.connectionKey, item.connectorId, connectionToUse, dispatch);
    }
  };

  const completeConnectionCreate = (workflowId: string, newItems: ConnectionItem[]): void => {
    setConnectionInCreate(false);
    const updatedGroups = groups().reduce((result: IGroup[], current: IGroup) => {
      const updatedGroup = { ...current, startIndex: newItems.findIndex((item) => item.workflowId === current.key) };
      if (current.key === workflowId) {
        updatedGroup.count = current.count - 1;
      }
      result.push(updatedGroup);
      return result;
    }, []);
    setGroups(updatedGroups);

    if (isSingleWorkflow) {
      setColumns(
        columns().map((col, index) => ({
          ...col,
          showSortIconWhenUnsorted: index !== 3,
          onColumnClick: index === 3 ? undefined : _onColumnClick,
        }))
      );
    }
  };

  const updateItemInConnectionsList = (item: ConnectionItem) => {
    const newList = connectionsList().map((connection: ConnectionItem) => (connection.id === item.id ? item : connection));
    setConnectionsList(newList);
  };

  const handleConnectionCancelled = (workflowId: string, connectionKey: string): void => {
    const newListItems = connectionsList().filter((current: ConnectionItem) => current.connectionKey !== connectionKey);
    setConnectionsList(newListItems);
    completeConnectionCreate(workflowId, newListItems);
  };

  const handleConnectionCreate = (item: ConnectionItem, connection: Connection) => {
    const actualItemKey = item.connectionKey.replace(createPlaceholderKey, '');
    const newListItems = connectionsList()
      .filter((current: ConnectionItem) => current.connectionKey !== item.connectionKey)
      .map((current) =>
        current.connectionKey === actualItemKey
          ? {
              ...current,
              allConnections: [...(current.allConnections ?? []), connection],
              connection: { id: connection.id, displayName: connection.properties.displayName },
              hasConnection: true,
            }
          : current
      );
    setConnectionsList(newListItems);
    completeConnectionCreate(item.workflowId, newListItems);
  };

  const handleConnectionCreateClick = (item: ConnectionItem) => {
    const newListItems = connectionsList().reduce((result: ConnectionItem[], current: ConnectionItem) => {
      result.push(current);
      if (current.workflowId === item.workflowId && current.connectionKey === item.connectionKey) {
        result.push({ ...current, connectionKey: `${createPlaceholderKey}${current.connectionKey}`, id: guid() });
      }

      return result;
    }, []);

    setConnectionsList(newListItems);
    const updatedGroups = groups().reduce((result: IGroup[], current: IGroup) => {
      const updatedGroup = { ...current, startIndex: newListItems.findIndex((item) => item.workflowId === current.key) };
      if (current.key === item.workflowId) {
        updatedGroup.count = current.count + 1;
      }
      result.push(updatedGroup);
      return result;
    }, []);
    setGroups(updatedGroups);

    if (isSingleWorkflow) {
      setColumns(columns().map((col) => ({ ...col, showSortIconWhenUnsorted: false, onColumnClick: undefined })));
    }
    setConnectionInCreate(true);
  };

  const onRenderRow = (props: IDetailsRowProps | undefined) => {
    if (props) {
      const {
        item,
        item: { workflowId, connectionKey, connectorId },
      } = props;
      if (connectionKey.startsWith(createPlaceholderKey)) {
        return (
          <CreateConnectionInTemplate
            connectorId={connectorId}
            connectionKey={connectionKey.replace(createPlaceholderKey, '')}
            onConnectionCreated={(connection) => handleConnectionCreate(item, connection)}
            onConnectionCancelled={() => handleConnectionCancelled(workflowId, connectionKey)}
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
          <div className="msla-template-connection-name">
            <ConnectorIconWithName
              aria-label={item.connectorDisplayName}
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
                  : (connector: ConnectorInfo) => updateItemInConnectionsList({ ...item, connectorDisplayName: connector.displayName })
              }
            />
            <Text className="msla-template-connection-key">{`(${item.connectionKey.replace('_#workflowname#', '')})`}</Text>
          </div>
        );

      case '$status':
        return (
          <ConnectionStatusWithProgress
            aria-label={
              item.hasConnection
                ? intl.formatMessage({ defaultMessage: 'Connected', description: 'Label text to connected status', id: 'XR5izH' })
                : intl.formatMessage({ defaultMessage: 'Not connected', description: 'Label text to not connected status', id: 'YnSO/8' })
            }
            item={item}
            intl={intl}
            onConnectionLoaded={(connections) => onConnectionsLoaded(connections, item)}
          />
        );

      case '$connection':
        return (
          <ConnectionName
            aria-label={
              item.connection?.displayName ??
              intl.formatMessage({ defaultMessage: 'Connect', description: 'Link to create a connection', id: 'yQ6+nV' })
            }
            item={item}
            intl={intl}
            disabled={isConnectionInCreate}
            onCreate={handleConnectionCreateClick}
          />
        );

      case '$connectionsList':
        return (
          <ConnectionsList
            aria-label={intl.formatMessage({ defaultMessage: 'Connections list', description: 'Connections list', id: 'w+7aGo' })}
            item={item}
            intl={intl}
            onSelect={updateItemInConnectionsList}
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
        setKey="id"
        items={connectionsList()}
        columns={columns()}
        groups={isSingleWorkflow ? undefined : groups()}
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

    setupTemplateConnection(item.connectionKey, item.connectorId, connection, dispatch);
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

const setupTemplateConnection = async (
  connectionKey: string,
  connectorId: string,
  connection: Connection,
  dispatch: AppDispatch
): Promise<void> => {
  await ConnectionService().setupConnectionIfNeeded(connection);
  const connector = await getConnector(connectorId);
  dispatch(updateTemplateConnection({ connector, connection: connection, nodeId: connectionKey, connectionKey }));
};

const getConnectionDisplayName = (connection: Connection): string => {
  return connection.properties.displayName ?? connection.id.split('/').slice(-1)[0];
};

const copyAndSort = (items: ConnectionItem[], columnKey: string, isSortedDescending?: boolean): ConnectionItem[] => {
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
};
