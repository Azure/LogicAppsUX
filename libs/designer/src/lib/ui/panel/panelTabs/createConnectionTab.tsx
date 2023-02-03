import constants from '../../../common/constants';
import type { AppDispatch, RootState } from '../../../core';
import { getConnectionMetadata, needsOAuth, updateNodeConnection } from '../../../core/actions/bjsworkflow/connections';
import { getUniqueConnectionName } from '../../../core/queries/connections';
import { useConnectorByNodeId, useGateways, useSubscriptions } from '../../../core/state/connection/connectionSelector';
import { useMonitoringView } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import { isolateTab, showDefaultTabs } from '../../../core/state/panel/panelSlice';
import { useOperationInfo, useOperationManifest } from '../../../core/state/selectors/actionMetadataSelector';
import { getAssistedConnectionProps, getConnectionParametersForAzureConnection } from '../../../core/utils/connectors/connections';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { ConnectionCreationInfo, ConnectionParametersMetadata } from '@microsoft/designer-client-services-logic-apps';
import { LogEntryLevel, LoggerService, ConnectionService } from '@microsoft/designer-client-services-logic-apps';
import { CreateConnection } from '@microsoft/designer-ui';
import type { PanelTab } from '@microsoft/designer-ui';
import type { Connection, ConnectionParameterSet, ConnectionParameterSetValues } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
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
  const isMonitoringView = useMonitoringView();

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

  const assistedConnectionProps = useMemo(
    () => (connector ? getAssistedConnectionProps(connector, operationManifest) : undefined),
    [connector, operationManifest]
  );

  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedSubResource, setSelectedSubResource] = useState<any | undefined>();

  const selectResourceCallback = useCallback((resourceId: string) => {
    setSelectedResourceId(resourceId);
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

      if (selectedParameterSet) {
        const requiredParameters = Object.entries(selectedParameterSet?.parameters)?.filter(
          ([, parameter]) => parameter?.uiDefinition.constraints?.required
        );
        requiredParameters?.forEach(([key, parameter]) => {
          if (!outputParameterValues?.[key]) {
            outputParameterValues[key] = parameter?.uiDefinition.constraints?.default;
          }
        });
      }

      try {
        // Assign connection parameters from resource selector experience
        if (assistedConnectionProps) {
          const assistedParams = await getConnectionParametersForAzureConnection(
            operationManifest?.properties.connection?.type,
            selectedSubResource
          );
          outputParameterValues = { ...outputParameterValues, ...assistedParams };
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
          dispatch(showDefaultTabs({ isMonitoringView }));
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
    [
      applyNewConnection,
      assistedConnectionProps,
      connectionMetadata,
      connector,
      dispatch,
      operationManifest?.properties.connection?.type,
      selectedSubResource,
      isMonitoringView,
    ]
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
      resourceSelectedProps={resourceSelectorProps}
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
