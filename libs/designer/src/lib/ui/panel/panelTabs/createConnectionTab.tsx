import constants from '../../../common/constants';
import type { AppDispatch, RootState } from '../../../core';
import { getConnectionMetadata, needsAuth, updateNodeConnection } from '../../../core/actions/bjsworkflow/connections';
import { getUniqueConnectionName } from '../../../core/queries/connections';
import { useConnectorByNodeId, useGateways, useSubscriptions } from '../../../core/state/connection/connectionSelector';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import { isolateTab, showDefaultTabs } from '../../../core/state/panel/panelSlice';
import { useOperationInfo, useOperationManifest } from '../../../core/state/selectors/actionMetadataSelector';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { ConnectionCreationInfo, ConnectionParametersMetadata } from '@microsoft-logic-apps/designer-client-services';
import { LogEntryLevel, LoggerService, ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import type { Connection, ConnectionParameterSet, ConnectionParameterSetValues, ConnectionType } from '@microsoft-logic-apps/utils';
import { CreateConnection } from '@microsoft/designer-ui';
import type { PanelTab } from '@microsoft/designer-ui';
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

  const subscriptionsQuery = useSubscriptions();
  const subscriptions = useMemo(() => subscriptionsQuery.data, [subscriptionsQuery.data]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('');
  const gatewaysQuery = useGateways(selectedSubscriptionId, connector?.id ?? '');
  const availableGateways = useMemo(() => gatewaysQuery.data, [gatewaysQuery]);
  const needsAuthentication = useMemo(() => needsAuth(connector), [connector]);

  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const applyNewConnection = useCallback(
    (newConnection: Connection, _newName: string) => {
      dispatch(updateNodeConnection({ nodeId, connectionId: newConnection?.id, connectorId: connector?.id ?? '' }));
    },
    [connector?.id, dispatch, nodeId]
  );

  const createConnectionCallback = useCallback(
    async (displayName?: string, selectedParameterSet?: ConnectionParameterSet, parameterValues: Record<string, any> = {}) => {
      if (!connector?.id) return;

      setIsLoading(true);
      setErrorMessage(undefined);

      const newName = selectedParameterSet?.name ?? (await getUniqueConnectionName(connector.id));
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
        let connection, err;

        if (needsAuthentication) {
          await ConnectionService()
            .createAndAuthorizeOAuthConnection(newName, connector?.id ?? '', connectionInfo, parametersMetadata)
            .then(({ connection: c, errorMessage }) => {
              connection = c;
              err = errorMessage;
            })
            .catch((errorMessage) => (err = errorMessage));
        } else {
          await ConnectionService()
            .createConnection(newName, connector?.id ?? '', connectionInfo, parametersMetadata)
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
        const message = `Failed to create OAuth connection: ${error}`;
        LoggerService().log({ level: LogEntryLevel.Error, area: 'create connection tab', message });
      }
      setIsLoading(false);
    },
    [applyNewConnection, connectionMetadata?.type, connector, dispatch, needsAuthentication]
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
      connectionParameters={connector.properties.connectionParameters}
      connectionParameterSets={connector.properties.connectionParameterSets}
      createConnectionCallback={createConnectionCallback}
      isLoading={isLoading}
      cancelCallback={cancelCallback}
      hideCancelButton={!hasExistingConnection}
      needsAuth={needsAuthentication}
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
