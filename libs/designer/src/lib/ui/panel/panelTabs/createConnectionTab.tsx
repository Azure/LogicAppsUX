import constants from '../../../common/constants';
import type { AppDispatch, RootState } from '../../../core';
import {
  getConnectionMetadata,
  isAzureFunctionConnection,
  needsOAuth,
  updateNodeConnection,
} from '../../../core/actions/bjsworkflow/connections';
import { getUniqueConnectionName } from '../../../core/queries/connections';
import { useConnectorByNodeId, useGateways, useSubscriptions } from '../../../core/state/connection/connectionSelector';
import { useIsConsumption } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import { isolateTab, showDefaultTabs } from '../../../core/state/panel/panelSlice';
import { useOperationInfo, useOperationManifest } from '../../../core/state/selectors/actionMetadataSelector';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { ConnectionCreationInfo, ConnectionParametersMetadata } from '@microsoft/designer-client-services-logic-apps';
import { LogEntryLevel, LoggerService, ConnectionService } from '@microsoft/designer-client-services-logic-apps';
import { CreateConnection } from '@microsoft/designer-ui';
import type { PanelTab } from '@microsoft/designer-ui';
import type { Connection, ConnectionParameterSet, ConnectionParameterSetValues } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

const CreateConnectionTab = () => {
  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();
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
      dispatch(updateNodeConnection({ nodeId, connectionId: newConnection?.id, connectorId: connector?.id ?? '' }));
    },
    [connector?.id, dispatch, nodeId]
  );

  const needsAzureFunction = useMemo(() => (connector ? isAzureFunctionConnection(connector) : false), [connector]);

  const functionAppsQuery = useQuery(['functionApps'], async () => ConnectionService().fetchFunctionApps() ?? [], {
    enabled: needsAzureFunction,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const [appId, setAppId] = useState<string | undefined>();
  const [selectedAzureFunction, setSelectedAzureFunction] = useState<any | undefined>();

  const selectAppCallback = useCallback((appId: string) => {
    setAppId(appId);
    setSelectedAzureFunction(undefined);
  }, []);

  const selectFunctionCallback = useCallback((appFunction: any) => {
    setSelectedAzureFunction(appFunction);
  }, []);

  const isConsumption = useIsConsumption();

  const createConnectionCallback = useCallback(
    async (
      displayName?: string,
      selectedParameterSet?: ConnectionParameterSet,
      parameterValues: Record<string, any> = {},
      isOAuthConnection?: boolean
    ) => {
      if (!connector?.id) return;

      setIsLoading(true);
      setErrorMessage(undefined);

      let outputParameterValues = parameterValues;
      if (selectedParameterSet && !isConsumption) {
        outputParameterValues['Type'] = selectedParameterSet?.name;
      }

      try {
        // Assign azure function as parameters
        if (needsAzureFunction && selectedAzureFunction) {
          const authCodeValue = await ConnectionService().fetchFunctionKey(selectedAzureFunction?.id);
          const triggerUrl = selectedAzureFunction?.properties?.invoke_url_template;
          const functionAsParameters = {
            function: { id: selectedAzureFunction?.id },
            triggerUrl,
            authentication: {
              type: 'QueryString',
              name: 'Code',
              value: authCodeValue,
            },
          };

          outputParameterValues = { ...outputParameterValues, ...functionAsParameters };
        }

        const connectionParameterSetValues: ConnectionParameterSetValues = {
          name: selectedParameterSet?.name ?? '',
          values: Object.keys(outputParameterValues).reduce((acc: any, key) => {
            // eslint-disable-next-line no-param-reassign
            acc[key] = { value: outputParameterValues[key] };
            return acc;
          }, {}),
        };
        const connectionInfo: ConnectionCreationInfo = {
          displayName,
          connectionParametersSet: selectedParameterSet ? connectionParameterSetValues : undefined,
          connectionParameters: outputParameterValues,
        };

        const parametersMetadata: ConnectionParametersMetadata = {
          connectionMetadata: connectionMetadata,
          connectionParameterSet: selectedParameterSet,
          connectionParameters: selectedParameterSet?.parameters ?? connector?.properties.connectionParameters,
        };

        let connection, err;

        const newName = await getUniqueConnectionName(connector.id);
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
          applyNewConnection(connection, newName);
          dispatch(showDefaultTabs());
        } else if (err) {
          setErrorMessage(err);
        }
      } catch (error: any) {
        setErrorMessage(error.responseText);
        const message = `Failed to create connection: ${error}`;
        LoggerService().log({ level: LogEntryLevel.Error, area: 'create connection tab', message });
      }
      setIsLoading(false);
    },
    [applyNewConnection, connectionMetadata, connector, dispatch, isConsumption, needsAzureFunction, selectedAzureFunction]
  );

  const cancelCallback = useCallback(() => {
    dispatch(isolateTab(constants.PANEL_TAB_NAMES.CONNECTION_SELECTOR));
  }, [dispatch]);

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connection data...',
    description: 'Message to show under the loading icon when loading connection parameters',
  });

  if (connector?.properties === undefined)
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.large} label={loadingText} />
      </div>
    );

  return (
    <CreateConnection
      connectorDisplayName={connector.properties.displayName}
      connectorCapabilities={connector.properties.capabilities}
      connectionParameters={connector.properties.connectionParameters}
      connectionParameterSets={connector.properties.connectionParameterSets}
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
      checkOAuthCallback={needsOAuth}
      needsAzureFunction={needsAzureFunction}
      functionAppsQuery={functionAppsQuery}
      selectedAppId={appId ?? ''}
      selectAppCallback={selectAppCallback}
      selectedFunctionId={selectedAzureFunction?.id ?? ''}
      fetchFunctionsCallback={(functionAppId: string) => ConnectionService().fetchFunctionAppsFunctions(functionAppId)}
      selectFunctionCallback={selectFunctionCallback}
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
