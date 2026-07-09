import constants from '../../../../common/constants';
import type { AppDispatch } from '../../../../core';
import { getApiHubAuthentication, getConnectionProperties, needsOAuth } from '../../../../core/actions/bjsworkflow/connections';
import { getUniqueConnectionName, updateNewConnectionInQueryCache } from '../../../../core/queries/connections';
import { useConnector, useGatewayServiceConfig, useGateways, useSubscriptions } from '../../../../core/state/connection/connectionSelector';
import { setIsCreatingConnection } from '../../../../core/state/panel/panelSlice';
import { getConnectionParametersForAzureConnection, getSupportedParameterSets } from '../../../../core/utils/connectors/connections';
import { CreateConnection, type CreateButtonTexts } from './createConnection';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import type {
  ConnectionParameterSetValues,
  ConnectionParameterSets,
  ConnectionMetadata,
  ConnectionCreationInfo,
  ConnectionParametersMetadata,
  Connection,
  ConnectionParameterSet,
  Connector,
  ManagedIdentity,
  OperationManifest,
} from '@microsoft/logic-apps-shared';
import {
  ConnectionParameterTypes,
  ConnectionService,
  LogEntryLevel,
  LoggerService,
  WorkflowService,
  equals,
  getIconUriFromConnector,
} from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { AssistedConnectionProps } from '@microsoft/designer-ui';
import type { CreatedConnectionPayload } from './createConnectionWrapper';

export const CreateConnectionInternal = (props: {
  classes?: Record<string, string>;
  connectionName?: string;
  connectorId: string;
  operationType: string;
  existingReferences: string[];
  hideCancelButton: boolean;
  showActionBar: boolean;
  updateConnectionInState: (payload: CreatedConnectionPayload) => void;
  onConnectionCreated: (connection: Connection) => void;
  onConnectionCancelled?: () => void;
  createButtonTexts?: CreateButtonTexts;
  description?: string;
  nodeIds?: string[];
  isAgentSubgraph?: boolean;
  assistedConnectionProps?: AssistedConnectionProps;
  connectionMetadata?: ConnectionMetadata;
  updateOperationParameterValues?: (values?: Record<string, any>) => void;
  operationManifest?: OperationManifest;
  workflowKind?: string;
  workflowMetadata?: { agentType?: string };
  connectionParameterSetsOverride?: ConnectionParameterSets;
  enableManagedIdentityPicker?: boolean;
}) => {
  const {
    classes,
    connectionName,
    connectorId,
    description,
    operationType,
    assistedConnectionProps,
    existingReferences,
    connectionMetadata,
    nodeIds = [],
    hideCancelButton,
    showActionBar,
    createButtonTexts,
    updateConnectionInState,
    onConnectionCreated,
    onConnectionCancelled,
    updateOperationParameterValues,
    isAgentSubgraph,
    operationManifest,
    workflowKind,
    workflowMetadata,
    connectionParameterSetsOverride,
    enableManagedIdentityPicker,
  } = props;
  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();
  const { data: connector } = useConnector(connectorId);
  const iconUri = useMemo(() => getIconUriFromConnector(connector), [connector]);
  const subscriptionsQuery = useSubscriptions();
  const subscriptions = useMemo(() => subscriptionsQuery.data, [subscriptionsQuery.data]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('');
  const gatewaysQuery = useGateways(selectedSubscriptionId, connector?.id ?? '');
  const availableGateways = useMemo(() => gatewaysQuery.data, [gatewaysQuery]);
  const gatewayServiceConfig = useGatewayServiceConfig();
  const identity = WorkflowService().getAppIdentity?.() as ManagedIdentity;

  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
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

  const updateNewConnectionInCache = useCallback(
    async (newConnection: Connection) => updateNewConnectionInQueryCache(connector?.id ?? '', newConnection),
    [connector?.id]
  );

  const applyNewConnection = useCallback(
    (
      newConnection: Connection,
      selectedIdentity?: string,
      isUsingDynamicConnection?: boolean,
      additionalConnectionProperties?: Record<string, any>
    ) => {
      const payload: CreatedConnectionPayload = {
        connection: newConnection,
        connector: connector as Connector,
      };

      if (selectedIdentity) {
        const userAssignedIdentity = selectedIdentity !== constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY ? selectedIdentity : undefined;
        payload.connectionProperties = getConnectionProperties(connector as Connector, userAssignedIdentity);
        payload.authentication = getApiHubAuthentication(userAssignedIdentity);
      } else if (additionalConnectionProperties) {
        // Multi-auth ManagedServiceIdentity path (e.g., MCP connectors with MSI parameter set)
        payload.connectionProperties = additionalConnectionProperties;
      }

      if (isUsingDynamicConnection) {
        payload.connectionProperties = {
          ...(payload.connectionProperties ?? {}),
          runtimeSource: 'Dynamic',
          dynamicConnectionProxyUrl: newConnection?.properties?.dynamicConnectionProxyUrl ?? undefined,
        };
      }

      updateConnectionInState(payload);
      onConnectionCreated(newConnection);
    },
    [connector, onConnectionCreated, updateConnectionInState]
  );

  const createConnectionCallback = useCallback(
    async (
      displayName?: string,
      selectedParameterSet?: ConnectionParameterSet,
      parameterValues: Record<string, any> = {},
      isOAuthConnection?: boolean,
      alternativeParameterValues?: Record<string, any>,
      identitySelected?: string,
      additionalParameterValues?: Record<string, any>,
      operationParameterValues?: Record<string, any>,
      isUsingDynamicConnection?: boolean
    ) => {
      if (!connector?.id) {
        return;
      }

      setIsCreating(true);
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
            connectionMetadata?.type,
            selectedSubResource,
            outputParameterValues,
            !!selectedParameterSet // TODO: Should remove this when backend updates all connection parameters for functions and apim
          );
        }

        const connectionInfo: ConnectionCreationInfo = {
          displayName,
          connectionParametersSet: selectedParameterSet
            ? getConnectionParameterSetValues(
                selectedParameterSet.name,
                outputParameterValues,
                Object.keys(selectedParameterSet.parameters ?? {})
              )
            : undefined,
          connectionParameters: outputParameterValues,
          operationParameterValues,
          alternativeParameterValues,
          additionalParameterValues,
          features: isUsingDynamicConnection ? 'DynamicUserInvoked' : undefined,
        };

        const parametersMetadata: ConnectionParametersMetadata = {
          connectionMetadata,
          connectionParameterSet: selectedParameterSet,
          connectionParameters: selectedParameterSet?.parameters ?? connector?.properties.connectionParameters,
        };

        let connection: Connection | undefined;
        let err: string | undefined;

        const newName = connectionName ? connectionName : await getUniqueConnectionName(connector.id, existingReferences);
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
          updateNewConnectionInCache(connection);

          // For multi-auth managed identity parameter sets (e.g., managed MCP connectors), build
          // connectionProperties.authentication from the user-provided values. Connectors can name
          // the parameter set anything (e.g. 'oauthMI'), so detect by parameter type/editor.
          let msiConnectionProperties: Record<string, any> | undefined;
          const identityParameterKey = Object.entries(selectedParameterSet?.parameters ?? {}).find(
            ([, p]: [string, any]) =>
              p?.type === ConnectionParameterTypes.managedIdentity || equals(p?.uiDefinition?.constraints?.editor, 'identitypicker')
          )?.[0];
          const isMsiParameterSet = equals(selectedParameterSet?.name, 'ManagedServiceIdentity') || !!identityParameterKey;
          if (!identitySelected && isMsiParameterSet) {
            const userIdentity = identityParameterKey ? outputParameterValues[identityParameterKey] : outputParameterValues['identity'];
            const mcpAudience = outputParameterValues['audience'];
            msiConnectionProperties = {
              authentication: {
                type: 'ManagedServiceIdentity',
                ...(mcpAudience ? { audience: mcpAudience } : {}),
                ...(userIdentity ? { identity: userIdentity } : {}),
              },
            };
          }

          applyNewConnection(connection, identitySelected, isUsingDynamicConnection, msiConnectionProperties);
          updateOperationParameterValues?.(operationParameterValues);
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
      setIsCreating(false);
    },
    [
      applyNewConnection,
      assistedConnectionProps,
      connectionMetadata,
      connectionName,
      connector,
      existingReferences,
      selectedSubResource,
      updateNewConnectionInCache,
      updateOperationParameterValues,
    ]
  );

  const cancelCallback = useCallback(() => {
    dispatch(setIsCreatingConnection(false));
    if (onConnectionCancelled) {
      onConnectionCancelled();
    }
  }, [dispatch, onConnectionCancelled]);

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connection data...',
    id: 'faUrud',
    description: 'Message to show under the loading icon when loading connection parameters',
  });

  if (connector?.properties === undefined) {
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.small} label={loadingText} />
      </div>
    );
  }

  return (
    <CreateConnection
      nodeIds={nodeIds}
      iconUri={iconUri}
      showActionBar={showActionBar}
      classes={classes}
      connector={connector}
      connectionParameterSets={getSupportedParameterSets(
        connector.properties.connectionParameterSets ?? connectionParameterSetsOverride,
        operationType,
        connector.properties.capabilities
      )}
      operationParameterSets={connector.properties.operationParameterSets}
      isAgentSubgraph={isAgentSubgraph}
      createButtonTexts={createButtonTexts}
      description={description}
      identity={identity}
      createConnectionCallback={createConnectionCallback}
      isLoading={isCreating}
      cancelCallback={cancelCallback}
      hideCancelButton={hideCancelButton}
      errorMessage={errorMessage}
      clearErrorCallback={() => setErrorMessage(undefined)}
      selectSubscriptionCallback={(subscriptionId: string) => setSelectedSubscriptionId(subscriptionId)}
      selectedSubscriptionId={selectedSubscriptionId}
      availableSubscriptions={subscriptions}
      availableGateways={availableGateways}
      gatewayServiceConfig={gatewayServiceConfig}
      checkOAuthCallback={needsOAuth}
      resourceSelectorProps={resourceSelectorProps}
      operationManifest={operationManifest}
      workflowKind={workflowKind}
      workflowMetadata={workflowMetadata}
      enableManagedIdentityPicker={enableManagedIdentityPicker}
    />
  );
};

export function getConnectionParameterSetValues(
  selectedParameterSetName: string,
  outputParameterValues: Record<string, any>,
  validParameterKeys?: string[]
): ConnectionParameterSetValues {
  // Filter to only include parameters that are defined in the parameter set
  // This prevents sending parameters that the connector API doesn't recognize
  const filteredParameterValues = validParameterKeys
    ? Object.fromEntries(Object.entries(outputParameterValues).filter(([key]) => validParameterKeys.includes(key)))
    : outputParameterValues;

  return {
    name: selectedParameterSetName,
    values: Object.fromEntries(Object.keys(filteredParameterValues).map((key) => [key, { value: filteredParameterValues[key] }])),
  };
}
