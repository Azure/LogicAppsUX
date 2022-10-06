import constants from '../../../common/constants';
import type { RootState } from '../../../core';
import { getConnectionMetadata, needsAuth } from '../../../core/actions/bjsworkflow/connections';
import { getUniqueConnectionName } from '../../../core/queries/connections';
import { useConnectorByNodeId, useGateways, useSubscriptions } from '../../../core/state/connection/connectionSelector';
import { changeConnectionMapping } from '../../../core/state/connection/connectionSlice';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import { isolateTab, showDefaultTabs } from '../../../core/state/panel/panelSlice';
import { useOperationInfo, useOperationManifest } from '../../../core/state/selectors/actionMetadataSelector';
import type { ConnectionCreationInfo, ConnectionParametersMetadata } from '@microsoft-logic-apps/designer-client-services';
import { LogEntryLevel, LoggerService, ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import type { Connection, ConnectionParameterSet, ConnectionParameterSetValues, ConnectionType } from '@microsoft-logic-apps/utils';
import { CreateConnection } from '@microsoft/designer-ui';
import type { PanelTab } from '@microsoft/designer-ui';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const CreateConnectionTab = () => {
  const dispatch = useDispatch();

  const nodeId: string = useSelectedNodeId();
  const connector = useConnectorByNodeId(nodeId);
  const operationInfo = useOperationInfo(nodeId);
  const { data: operationManifest } = useOperationManifest(operationInfo);
  const connectionMetadata = getConnectionMetadata(operationManifest);
  const hasExistingConnection = useSelector((state: RootState) => !!state.connections.connectionsMapping[nodeId]);

  const subscriptionsQuery = useSubscriptions();
  const subscriptions = useMemo(() => subscriptionsQuery.data, [subscriptionsQuery.data]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('');
  const gatewaysQuery = useGateways(selectedSubscriptionId, connector?.id ?? '');
  const availableGateways = useMemo(() => gatewaysQuery.data, [gatewaysQuery]);

  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const applyNewConnection = useCallback(
    (newConnection: Connection, _newName: string) => {
      dispatch(changeConnectionMapping({ nodeId, connectionId: newConnection?.id, connectorId: connector?.id ?? '' }));
    },
    [connector?.id, dispatch, nodeId]
  );

  const createConnectionCallback = useCallback(
    async (displayName: string, selectedParameterSet?: ConnectionParameterSet, parameterValues: Record<string, any> = {}) => {
      setErrorMessage(undefined);
      setIsLoading(true);

      const connectionParameterSetValues: ConnectionParameterSetValues = {
        name: selectedParameterSet?.name ?? '',
        values: Object.keys(parameterValues).reduce((acc: any, key) => {
          // eslint-disable-next-line no-param-reassign
          acc[key] = { value: parameterValues[key] };
          return acc;
        }, {}),
      };
      const connectionInfo: ConnectionCreationInfo = {
        displayName,
        connectionParametersSet: selectedParameterSet ? connectionParameterSetValues : undefined,
        connectionParameters: parameterValues,
      };

      const parametersMetadata: ConnectionParametersMetadata = {
        connectionType: connectionMetadata?.type as ConnectionType,
        connectionParameterSet: selectedParameterSet,
        connectionParameters: selectedParameterSet?.parameters ?? connector?.properties.connectionParameters,
      };

      try {
        const connectorId = connector?.id as string;
        const uniqueConnectionName = await getUniqueConnectionName(connectorId);
        const newConnection = await ConnectionService().createConnection(
          uniqueConnectionName,
          connectorId,
          connectionInfo,
          parametersMetadata
        );
        applyNewConnection(newConnection, uniqueConnectionName);
        dispatch(showDefaultTabs());
      } catch (error: any) {
        setErrorMessage(error.responseText);
        const errorMessage = `Unable to create connection for operation - ${nodeId}. Error details - ${JSON.stringify(error)}`;
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'create connection tab',
          message: errorMessage,
        });
      }
      setIsLoading(false);
    },
    [applyNewConnection, connectionMetadata?.type, connector?.id, connector?.properties.connectionParameters, dispatch, nodeId]
  );

  const needsAuthentication = useMemo(() => needsAuth(connector), [connector]);
  const authClickCallback = useCallback(async () => {
    if (!connector?.id) return;

    setIsLoading(true);
    setErrorMessage(undefined);

    const newName = await getUniqueConnectionName(connector.id);
    const connectionInfo: ConnectionCreationInfo = {
      displayName: newName,
      connectionParametersSet: undefined,
      connectionParameters: undefined,
    };

    try {
      const { connection, errorMessage: e } = await ConnectionService().createAndAuthorizeOAuthConnection(
        newName,
        connector?.id ?? '',
        connectionInfo
      );
      if (connection) {
        applyNewConnection(connection, newName);
        dispatch(showDefaultTabs());
      } else if (e) {
        setErrorMessage(e);
      }
    } catch (error: any) {
      setErrorMessage(error.responseText);
      const errorMessage = `Failed to create OAuth connection: ${error}`;
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'create connection tab',
        message: errorMessage,
      });
    }
    setIsLoading(false);
  }, [applyNewConnection, connector?.id, dispatch]);

  const cancelCallback = useCallback(() => {
    dispatch(isolateTab(constants.PANEL_TAB_NAMES.CONNECTION_SELECTOR));
  }, [dispatch]);

  // By the time you get to this component, there should always be a connector associated
  if (connector?.properties === undefined) return <p></p>;

  return (
    <CreateConnection
      connectorDisplayName={connector.properties.displayName}
      connectionParameters={connector.properties.connectionParameters}
      connectionParameterSets={connector.properties.connectionParameterSets}
      createConnectionCallback={createConnectionCallback}
      isLoading={isLoading}
      cancelCallback={cancelCallback}
      hideCancelButton={!hasExistingConnection}
      needsAuth={needsAuthentication}
      authClickCallback={authClickCallback}
      errorMessage={errorMessage}
      clearErrorCallback={() => setErrorMessage(undefined)}
      selectSubscriptionCallback={(subscriptionId: string) => {
        setSelectedSubscriptionId(subscriptionId);
      }}
      selectedSubscriptionId={selectedSubscriptionId}
      availableSubscriptions={subscriptions}
      availableGateways={availableGateways}
    />
  );
};

export const createConnectionTab: PanelTab = {
  title: 'Create Connection',
  name: constants.PANEL_TAB_NAMES.CONNECTION_CREATE,
  description: 'Create Connection Tab',
  visible: true,
  content: <CreateConnectionTab />,
  order: 0,
};
