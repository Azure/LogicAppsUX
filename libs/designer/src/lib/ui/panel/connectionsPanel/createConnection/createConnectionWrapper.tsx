import { useQueryClient } from '@tanstack/react-query';
import constants from '../../../../common/constants';
import type { AppDispatch, RootState } from '../../../../core';
import { useOperationInfo, useSelectedNodeId, useSelectedNodeIds } from '../../../../core';
import type { ConnectionPayload } from '../../../../core/actions/bjsworkflow/connections';
import {
  getApiHubAuthentication,
  getConnectionMetadata,
  getConnectionProperties,
  needsOAuth,
  updateNodeConnection,
} from '../../../../core/actions/bjsworkflow/connections';
import { getUniqueConnectionName } from '../../../../core/queries/connections';
import {
  useConnectorByNodeId,
  useGatewayServiceConfig,
  useGateways,
  useSubscriptions,
} from '../../../../core/state/connection/connectionSelector';
import { useReferencePanelMode } from '../../../../core/state/panel/panelSelectors';
import { openPanel, setIsCreatingConnection } from '../../../../core/state/panel/panelSlice';
import { useOperationManifest } from '../../../../core/state/selectors/actionMetadataSelector';
import {
  getAssistedConnectionProps,
  getConnectionParametersForAzureConnection,
  getSupportedParameterSets,
} from '../../../../core/utils/connectors/connections';
import { CreateConnection } from './createConnection';
import { Spinner } from '@fluentui/react-components';
import {
  ConnectionService,
  LogEntryLevel,
  LoggerService,
  WorkflowService,
  getIconUriFromConnector,
  getRecordEntry,
  type ConnectionCreationInfo,
  type ConnectionParametersMetadata,
  type Connection,
  type ConnectionParameterSet,
  type ConnectionParameterSetValues,
  type Connector,
  type ManagedIdentity,
} from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const CreateConnectionWrapper = () => {
  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();
  const nodeId: string = useSelectedNodeId();
  const nodeIds = useSelectedNodeIds();
  const connector = useConnectorByNodeId(nodeId);
  const iconUri = useMemo(() => getIconUriFromConnector(connector), [connector]);
  const operationInfo = useOperationInfo(nodeId);
  const { data: operationManifest } = useOperationManifest(operationInfo);
  const connectionMetadata = getConnectionMetadata(operationManifest);
  const hasExistingConnection = useSelector((state: RootState) => !!getRecordEntry(state.connections.connectionsMapping, nodeId));

  const subscriptionsQuery = useSubscriptions();
  const subscriptions = useMemo(() => subscriptionsQuery.data, [subscriptionsQuery.data]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('');
  const gatewaysQuery = useGateways(selectedSubscriptionId, connector?.id ?? '');
  const availableGateways = useMemo(() => gatewaysQuery.data, [gatewaysQuery]);
  const gatewayServiceConfig = useGatewayServiceConfig();

  const existingReferences = useSelector((state: RootState) => Object.keys(state.connections.connectionReferences));

  const identity = WorkflowService().getAppIdentity?.() as ManagedIdentity;

  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const applyNewConnection = useCallback(
    (_nodeId: string, newConnection: Connection, selectedIdentity?: string) => {
      const payload: ConnectionPayload = {
        nodeId: _nodeId,
        connection: newConnection,
        connector: connector as Connector,
      };

      if (selectedIdentity) {
        const userAssignedIdentity = selectedIdentity !== constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY ? selectedIdentity : undefined;
        payload.connectionProperties = getConnectionProperties(connector as Connector, userAssignedIdentity);
        payload.authentication = getApiHubAuthentication(userAssignedIdentity);
      }

      dispatch(updateNodeConnection(payload));
    },
    [connector, dispatch]
  );

  const assistedConnectionProps = useMemo(
    () => (connector ? getAssistedConnectionProps(connector, operationManifest) : undefined),
    [connector, operationManifest]
  );

  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedSubResource, setSelectedSubResource] = useState<any | undefined>();

  const selectResourceCallback = useCallback((resource: any) => {
    setSelectedResourceId(resource?.id);
    setSelectedSubResource(undefined);
  }, []);

  const selectSubResourceCallback = useCallback((subResource: any) => {
    setSelectedSubResource(subResource);
  }, []);

  const resourceSelectorProps = assistedConnectionProps
    ? {
        ...assistedConnectionProps,
        selectedResourceId,
        onResourceSelect: selectResourceCallback,
        selectedSubResource,
        onSubResourceSelect: selectSubResourceCallback,
      }
    : undefined;

  const referencePanelMode = useReferencePanelMode();
  const closeConnectionsFlow = useCallback(() => {
    const panelMode = referencePanelMode ?? 'Operation';
    const nodeId = panelMode === 'Operation' ? nodeIds?.[0] : undefined;
    dispatch(setIsCreatingConnection(false));
    dispatch(openPanel({ nodeId, panelMode }));
  }, [dispatch, referencePanelMode, nodeIds]);

  const queryClient = useQueryClient();
  const updateNewConnection = useCallback(
    async (newConnection: Connection) => {
      return queryClient.setQueryData<Connection[]>(
        ['connections', connector?.id?.toLowerCase()],
        (oldConnections: Connection[] | undefined) => [...(oldConnections ?? []), newConnection]
      );
    },
    [connector?.id, queryClient]
  );
  const createConnectionCallback = useCallback(
    async (
      displayName?: string,
      selectedParameterSet?: ConnectionParameterSet,
      parameterValues: Record<string, any> = {},
      isOAuthConnection?: boolean,
      alternativeParameterValues?: Record<string, any>,
      identitySelected?: string,
      additionalParameterValues?: Record<string, any>
    ) => {
      if (!connector?.id) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(undefined);

      let outputParameterValues = parameterValues;

      if (selectedParameterSet) {
        const requiredParameters = Object.entries(selectedParameterSet?.parameters)?.filter(
          ([, parameter]) => parameter?.uiDefinition?.constraints?.required === 'true'
        );
        requiredParameters?.forEach(([key, parameter]) => {
          if (!outputParameterValues?.[key]) {
            outputParameterValues[key] = parameter?.uiDefinition?.constraints?.default;
          }
        });
      }

      try {
        // If oauth, find the oauth parameter and assign the redirect url
        if (isOAuthConnection && selectedParameterSet) {
          const oAuthParameter = Object.entries(selectedParameterSet?.parameters).find(
            ([_, parameter]) => !!parameter?.oAuthSettings?.redirectUrl
          );
          if (oAuthParameter) {
            const oAuthParameterKey = oAuthParameter?.[0];
            const oAuthParameterObj = oAuthParameter?.[1];
            const redirectUrl = oAuthParameterObj?.oAuthSettings?.redirectUrl;
            outputParameterValues[oAuthParameterKey] = redirectUrl;
          }
        }

        // Assign connection parameters from resource selector experience
        if (assistedConnectionProps) {
          outputParameterValues = await getConnectionParametersForAzureConnection(
            operationManifest?.properties.connection?.type,
            selectedSubResource,
            outputParameterValues,
            !!selectedParameterSet // TODO: Should remove this when backend updates all connection parameters for functions and apim
          );
        }

        const connectionInfo: ConnectionCreationInfo = {
          displayName,
          connectionParametersSet: selectedParameterSet
            ? getConnectionParameterSetValues(selectedParameterSet.name, outputParameterValues)
            : undefined,
          connectionParameters: outputParameterValues,
          alternativeParameterValues,
          additionalParameterValues,
        };

        const parametersMetadata: ConnectionParametersMetadata = {
          connectionMetadata: connectionMetadata,
          connectionParameterSet: selectedParameterSet,
          connectionParameters: selectedParameterSet?.parameters ?? connector?.properties.connectionParameters,
        };

        let connection: Connection | undefined;
        let err: string | undefined;

        const newName = await getUniqueConnectionName(connector.id, existingReferences);
        if (isOAuthConnection) {
          await ConnectionService()
            .createAndAuthorizeOAuthConnection(newName, connector?.id ?? '', connectionInfo, parametersMetadata)
            .then(({ connection: c, errorMessage }) => {
              connection = c;
              err = errorMessage;
            })
            .catch((errorMessage) => (err = errorMessage));
        } else {
          await ConnectionService()
            .createConnection(newName, connector, connectionInfo, parametersMetadata)
            .then((c) => (connection = c))
            .catch((errorMessage) => (err = errorMessage));
        }

        if (connection) {
          updateNewConnection(connection);
          for (const nodeId of nodeIds) {
            applyNewConnection(nodeId, connection, identitySelected);
          }
          closeConnectionsFlow();
        } else if (err) {
          setErrorMessage(String(err));
        }
      } catch (error: any) {
        setErrorMessage(String(error?.responseText ?? error?.message));
        const message = `Failed to create connection: ${error}`;
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'create connection tab',
          message,
          error: error instanceof Error ? error : undefined,
        });
      }
      setIsLoading(false);
    },
    [
      connector,
      assistedConnectionProps,
      connectionMetadata,
      operationManifest?.properties.connection?.type,
      selectedSubResource,
      closeConnectionsFlow,
      nodeIds,
      applyNewConnection,
      existingReferences,
      updateNewConnection,
    ]
  );

  const cancelCallback = useCallback(() => {
    dispatch(setIsCreatingConnection(false));
  }, [dispatch]);

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connection data...',
    id: 'faUrud',
    description: 'Message to show under the loading icon when loading connection parameters',
  });

  if (connector?.properties === undefined) {
    return (
      <div className="msla-loading-container">
        <Spinner size={'large'} label={loadingText} />
      </div>
    );
  }

  return (
    <CreateConnection
      nodeIds={nodeIds}
      iconUri={iconUri}
      connectorId={connector.id}
      connectorDisplayName={connector.properties.displayName}
      connectorCapabilities={connector.properties.capabilities}
      connectionParameters={connector.properties.connectionParameters}
      connectionParameterSets={getSupportedParameterSets(
        connector.properties.connectionParameterSets,
        operationInfo.type,
        connector.properties.capabilities
      )}
      connectionAlternativeParameters={connector.properties?.connectionAlternativeParameters}
      identity={identity}
      createConnectionCallback={createConnectionCallback}
      isLoading={isLoading}
      cancelCallback={cancelCallback}
      hideCancelButton={!hasExistingConnection}
      errorMessage={errorMessage}
      clearErrorCallback={() => setErrorMessage(undefined)}
      selectSubscriptionCallback={(subscriptionId: string) => setSelectedSubscriptionId(subscriptionId)}
      selectedSubscriptionId={selectedSubscriptionId}
      availableSubscriptions={subscriptions}
      availableGateways={availableGateways}
      gatewayServiceConfig={gatewayServiceConfig}
      checkOAuthCallback={needsOAuth}
      resourceSelectorProps={resourceSelectorProps}
    />
  );
};

export function getConnectionParameterSetValues(
  selectedParameterSetName: string,
  outputParameterValues: Record<string, any>
): ConnectionParameterSetValues {
  return {
    name: selectedParameterSetName,
    values: Object.keys(outputParameterValues).reduce((acc: any, key) => {
      // eslint-disable-next-line no-param-reassign
      acc[key] = {
        value: outputParameterValues[key],
      };
      return acc;
    }, {}),
  };
}
