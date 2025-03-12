import type { IColumn, IContextualMenuProps, IDetailsRowProps, IGroup } from '@fluentui/react';
import {
  ContextualMenuItemType,
  css,
  DetailsList,
  DetailsRow,
  Icon,
  IconButton,
  SelectionMode,
  Shimmer,
  ShimmerElementType,
  SpinnerSize,
} from '@fluentui/react';
import { Link, Text, Image } from '@fluentui/react-components';
import type { Connection, Template } from '@microsoft/logic-apps-shared';
import {
  aggregate,
  ConnectionService,
  getObjectPropertyValue,
  getUniqueName,
  guid,
  isArmResourceId,
  normalizeConnectorId,
} from '@microsoft/logic-apps-shared';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { getConnectorResources } from '../../../core/templates/utils/helper';
import { type IntlShape, useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { ConnectorIconWithName } from './connector';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { useFunctionalState } from '@react-hookz/web';
import { CreateConnectionInTemplate } from './createConnection';
import React, { useEffect, useMemo, useState } from 'react';
import { autoCreateConnectionIfPossible, updateTemplateConnection } from '../../../core/actions/bjsworkflow/connections';
import { getConnector } from '../../../core/queries/operation';
import { useConnectorInfo, type ConnectorInfo } from '../../../core/templates/utils/queries';
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
  isConnectionCreating?: boolean;
}

export interface WorkflowConnectionsProps {
  connections: Record<string, Template.Connection>;
  viewMode?: 'compact' | 'full';
}

export const WorkflowConnections = ({ connections, viewMode = 'full' }: WorkflowConnectionsProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const isCompactView = viewMode === 'compact';
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
  const intlTexts = {
    columnsNames: {
      name: intl.formatMessage({ defaultMessage: 'Name', id: 'tRe2Ct', description: 'Column name for connector name' }),
      status: intl.formatMessage({ defaultMessage: 'Status', id: 't7ytOJ', description: 'Column name for connection status' }),
      connection: intl.formatMessage({
        defaultMessage: 'Connection',
        id: 'hlrKDC',
        description: 'Column name for connection display name',
      }),
      connectionsList: intl.formatMessage({ defaultMessage: 'Connections list', id: 'w+7aGo', description: 'Connections list' }),
    },
    createConnectionTexts: {
      defaultCreate: intl.formatMessage({
        defaultMessage: 'Add connection',
        id: 'cwHxwb',
        description: 'Text for create connection button',
      }),
      create: intl.formatMessage({ defaultMessage: 'Authenticate', id: 'marivS', description: 'Create connection button text' }),
      creating: intl.formatMessage({ defaultMessage: 'Authenticating', id: 'bVWmOW', description: 'Creating connection button text' }),
    },
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
            isConnectionCreating: false,
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

  const [columns, setColumns] = useFunctionalState<IColumn[]>(() => {
    const result = [
      {
        ariaLabel: intlTexts.columnsNames.name,
        fieldName: '$name',
        key: '$name',
        isResizable: true,
        minWidth: 300,
        name: intlTexts.columnsNames.name,
        maxWidth: 350,
        showSortIconWhenUnsorted: true,
        onColumnClick: _onColumnClick,
      },
      {
        ariaLabel: intlTexts.columnsNames.connection,
        fieldName: '$connection',
        flexGrow: 3,
        key: '$connection',
        isResizable: true,
        minWidth: 200,
        maxWidth: 250,
        name: intlTexts.columnsNames.connection,
        showSortIconWhenUnsorted: true,
        className: 'msla-template-connection-grid-cell',
        onColumnClick: _onColumnClick,
      },
      {
        ariaLabel: intlTexts.columnsNames.connectionsList,
        fieldName: '$connectionsList',
        key: '$connectionsList',
        minWidth: 10,
        maxWidth: 10,
        name: '',
        className: 'msla-template-connection-grid-cell',
      },
    ];

    if (!isCompactView) {
      result.splice(1, 0, {
        ariaLabel: intlTexts.columnsNames.status,
        fieldName: '$status',
        key: '$status',
        isResizable: true,
        minWidth: 150,
        maxWidth: 150,
        name: intlTexts.columnsNames.status,
        showSortIconWhenUnsorted: true,
        onColumnClick: _onColumnClick,
      });
    }

    return result;
  });

  useEffect(() => {
    if (!isSingleWorkflow || isCompactView) {
      setColumns(columns().map((col) => ({ ...col, showSortIconWhenUnsorted: false, onColumnClick: undefined })));
    }
  }, [columns, isCompactView, isSingleWorkflow, setColumns]);

  const [groups, setGroups] = useFunctionalState<IGroup[]>(
    Object.values(workflows).map((workflow) => ({
      key: workflow.id,
      name: workflow.manifest?.title ?? workflow.workflowName ?? workflow.id,
      level: 0,
      startIndex: connectionsList().findIndex((item) => item.workflowId === workflow.id),
      count: workflow.connectionKeys.length,
    }))
  );

  const onConnectionsLoaded = (loadedConnections: Connection[], item: ConnectionItem) => {
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

    if (isSingleWorkflow && !isCompactView) {
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

  const handleConnectionCreate = (item: ConnectionItem, connection: Connection, inlineCreate = false) => {
    const actualItemKey = item.connectionKey.replace(createPlaceholderKey, '');
    const newListItems = connectionsList()
      .filter((current: ConnectionItem) => inlineCreate || current.connectionKey !== item.connectionKey)
      .map((current) =>
        current.connectionKey === actualItemKey
          ? {
              ...current,
              allConnections: [...(current.allConnections ?? []), connection],
              connection: { id: connection.id, displayName: connection.properties.displayName },
              hasConnection: true,
              isConnectionCreating: false,
            }
          : current
      );
    setConnectionsList(newListItems);
    completeConnectionCreate(item.workflowId, newListItems);
  };

  const inlineConnectionCreationUI = (item: ConnectionItem) => {
    const newListItems = connectionsList().reduce((result: ConnectionItem[], current: ConnectionItem) => {
      result.push({ ...current, isConnectionCreating: false });
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

  const handleConnectionCreateClick = async (item: ConnectionItem) => {
    updateItemInConnectionsList({ ...item, isConnectionCreating: true });
    if (isSingleWorkflow) {
      setColumns(columns().map((col) => ({ ...col, showSortIconWhenUnsorted: false, onColumnClick: undefined })));
    }

    const nodeId = item.connectionKey;
    const connector = await getConnector(item.connectorId);
    const referenceKeys = Object.keys(references);
    const connectionKey = isArmResourceId(item.connectorId)
      ? item.connectionKey
      : (getUniqueName(referenceKeys, item.connectionKey).name ?? item.connectionKey);

    autoCreateConnectionIfPossible({
      connector,
      referenceKeys,
      applyNewConnection: (connection) => dispatch(updateTemplateConnection({ connection, connector, nodeId, connectionKey })),
      onSuccess: (connection) => handleConnectionCreate(item, connection, /* inlineCreate */ true),
      onManualConnectionCreation: () => inlineConnectionCreationUI(item),
    });
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
            showDescription={!isCompactView}
            createButtonTexts={
              isCompactView
                ? {
                    create: intlTexts.createConnectionTexts.create,
                    creating: intlTexts.createConnectionTexts.creating,
                    signIn: intlTexts.createConnectionTexts.create,
                    signingIn: intlTexts.createConnectionTexts.creating,
                  }
                : { create: intlTexts.createConnectionTexts.defaultCreate }
            }
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
      case '$name': {
        const onConnectorLoaded = item.connectorDisplayName
          ? undefined
          : (connector: ConnectorInfo) => updateItemInConnectionsList({ ...item, connectorDisplayName: connector.displayName });

        return isCompactView ? (
          <ConnectorWithConnectionStatus
            item={item}
            intl={intl}
            onConnectorLoaded={onConnectorLoaded}
            onConnectionLoaded={(connections) => onConnectionsLoaded(connections, item)}
          />
        ) : (
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
      }

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
            className={isCompactView ? 'msla-template-connection-cell-content' : undefined}
            item={item}
            intl={intl}
            disabled={isConnectionInCreate}
            onCreate={handleConnectionCreateClick}
          />
        );

      case '$connectionsList':
        return isConnectionInCreate ? null : (
          <ConnectionsList
            aria-label={intl.formatMessage({ defaultMessage: 'Connections list', description: 'Connections list', id: 'w+7aGo' })}
            className={isCompactView ? 'msla-template-connection-cell-content' : undefined}
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

const ConnectorWithConnectionStatus = ({
  item,
  intl,
  onConnectorLoaded,
  onConnectionLoaded,
}: {
  item: ConnectionItem;
  intl: IntlShape;
  onConnectorLoaded?: (connector: ConnectorInfo) => void;
  onConnectionLoaded: (connections: Connection[]) => void;
}): JSX.Element => {
  const { connectorId } = item;
  const { data: connector, isLoading } = useConnectorInfo(connectorId, /* operationId */ undefined, /* useCachedData */ true);

  useEffect(() => {
    if (onConnectorLoaded && connector) {
      onConnectorLoaded(connector);
    }
  }, [connector, onConnectorLoaded]);

  if (isLoading) {
    return (
      <div className="msla-template-connection-compact">
        <Shimmer shimmerElements={[{ type: ShimmerElementType.circle, width: '100%', height: 30 }]} />
        <div className="msla-template-connection-compact-text">
          <Shimmer
            style={{ width: '150px' }}
            shimmerElements={[{ type: ShimmerElementType.line, height: 12, verticalAlign: 'top' }]}
            size={SpinnerSize.xSmall}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="msla-template-connection-compact">
      <div className="msla-template-connection-compact-image">
        <Image src={connector?.iconUrl} style={{ width: 30, height: 30, borderRadius: 4 }} />
      </div>
      <div className="msla-template-connection-compact-text">
        <Text className="msla-template-connection-compact-connector">{connector?.displayName}</Text>
        <ConnectionStatusWithProgress
          className="msla-template-connection-compact-status"
          isCompactView={true}
          item={item}
          intl={intl}
          onConnectionLoaded={onConnectionLoaded}
        />
      </div>
    </div>
  );
};

const ConnectionStatusWithProgress = ({
  item,
  intl,
  className,
  isCompactView,
  onConnectionLoaded,
}: {
  className?: string;
  item: ConnectionItem;
  intl: IntlShape;
  isCompactView?: boolean;
  onConnectionLoaded: (connections: Connection[]) => void;
}): JSX.Element => {
  const { data } = useConnectionsForConnector(item.connectorId, /* shouldNotRefetch */ true);

  useEffect(() => {
    if (data && item.allConnections === undefined) {
      onConnectionLoaded(data.filter(isConnectionValid));
    }
  }, [data, item.allConnections, onConnectionLoaded]);

  return item.hasConnection !== undefined ? (
    <ConnectionStatus className={className} isCompactView={isCompactView} hasConnection={item.hasConnection} intl={intl} />
  ) : (
    <Shimmer
      className="msla-template-connection-status"
      style={{ width: '70px', marginTop: 8 }}
      shimmerElements={[{ type: ShimmerElementType.line, height: 10, verticalAlign: 'bottom', width: '100%' }]}
      size={SpinnerSize.xSmall}
    />
  );
};

const ConnectionStatus = ({
  hasConnection,
  intl,
  className,
  isCompactView,
}: {
  className?: string;
  hasConnection: boolean;
  isCompactView?: boolean;
  intl: IntlShape;
}): JSX.Element => {
  const resources = getConnectorResources(intl);
  const statusText: Record<string, string> = {
    true: isCompactView ? resources.authenticated : resources.connected,
    false: isCompactView ? resources.notAuthenticated : resources.notConnected,
  };
  const key = (!!hasConnection).toString();
  const details = connectionStatus[key];
  const status = (
    <Text className={className ?? 'msla-template-connection-status-text'} style={isCompactView ? { color: details.color } : undefined}>
      {statusText[key]}
    </Text>
  );
  return isCompactView ? (
    status
  ) : (
    <div className={className ?? 'msla-template-connection-status'}>
      <Icon style={{ color: details.color }} className="msla-template-connection-status-badge" iconName={details.iconName} />
      {status}
    </div>
  );
};

const ConnectionName = ({
  item,
  intl,
  disabled,
  className,
  onCreate,
}: {
  item: ConnectionItem;
  intl: IntlShape;
  className?: string;
  disabled: boolean;
  onCreate: (item: ConnectionItem) => void;
}): JSX.Element => {
  const { connection } = item;
  if (item.isConnectionCreating) {
    return <Shimmer className="msla-template-connection-text" style={{ width: '100px' }} />;
  }

  if (connection?.id) {
    return <Text className={className ?? 'msla-template-connection-text'}>{connection.displayName}</Text>;
  }

  const onCreateConnection = () => {
    onCreate(item);
  };
  return (
    <Link disabled={disabled} onClick={onCreateConnection}>
      {intl.formatMessage({ defaultMessage: 'Connect', description: 'Link to create a connection', id: 'yQ6+nV' })}
    </Link>
  );
};

const ConnectionsList = ({
  item,
  intl,
  className,
  onSelect,
  onCreate,
}: {
  item: ConnectionItem;
  intl: IntlShape;
  className?: string;
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
          disabled: item.isConnectionCreating,
          onClick: () => onConnectionSelection(key, text, data),
        };
      }),
      { key: 'divider_1', itemType: ContextualMenuItemType.Divider },
      {
        key: '$addConnection',
        iconProps: item.isConnectionCreating ? undefined : { iconName: 'Add', style: { marginLeft: '-15px' } },
        name: item.isConnectionCreating
          ? intl.formatMessage({ defaultMessage: 'Adding connection.....', description: 'Adding connection text.', id: '9L2sCO' })
          : intl.formatMessage({ defaultMessage: 'Add connection', description: 'Add connection', id: 'Q/V4Uc' }),
        disabled: item.isConnectionCreating,
        canCheck: false,
        isChecked: false,
        onClick: onCreateConnection,
      },
    ],
  };

  return (
    <IconButton menuIconProps={{ iconName: 'More' }} menuProps={menuProps} className={css('msla-template-connection-list', className)} />
  );
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
