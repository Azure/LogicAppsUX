import { useCallback, useState } from 'react';
import { Text, Spinner } from '@fluentui/react-components';
import { useDispatch } from 'react-redux';
import {
  equals,
  foundryServiceConnectionRegex,
  parseErrorMessage,
  supportedBaseManifestObjects,
  type Connection,
} from '@microsoft/logic-apps-shared';
import { useConnectionsForConnector } from '../../core/queries/connections';
import { SelectConnection } from '../panel/connectionsPanel/selectConnection/selectConnection';
import { CreateConnectionInternal } from '../panel/connectionsPanel/createConnection/createConnectionInternal';
import type { CreatedConnectionPayload } from '../panel/connectionsPanel/createConnection/createConnectionWrapper';
import { useEvaluateViewStyles } from './EvaluateView.styles';
import { finishSelectConnection, cancelSelectConnection } from '../../core/state/evaluation/evaluationSlice';
import { changeConnectionMappingsForNodes } from '../../core/state/connection/connectionSlice';
import { getConnectionMetadata } from '../../core/actions/bjsworkflow/connections';
import { AgentUtils } from '../../common/utilities/Utils';
import type { ConnectionReference } from '../../common/models/workflow';
import { useConnectionRefs, useConnectionRefsWithKeysByConnectorId } from '../../core/state/connection/connectionSelector';

const detectAgentModelType = (connection: Connection, connectionReference?: ConnectionReference): string => {
  if (connectionReference?.resourceId) {
    if (foundryServiceConnectionRegex.test(connectionReference.resourceId)) {
      return 'FoundryAgentService';
    }
  }
  const cognitiveId = connection.properties?.connectionParameters?.cognitiveServiceAccountId?.metadata?.value;
  if (cognitiveId && foundryServiceConnectionRegex.test(cognitiveId)) {
    return 'FoundryAgentService';
  }
  if (!cognitiveId) {
    return 'V1ChatCompletionsService';
  }
  return 'AzureOpenAI';
};

export const EvaluatorAgentConnectionSelector = () => {
  const styles = useEvaluateViewStyles();
  const dispatch = useDispatch();
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);

  const agentloopManifest = supportedBaseManifestObjects.get('agent');
  const agentConnectionMetadata = getConnectionMetadata(agentloopManifest);

  const connectionRefs = useConnectionRefs();
  const agentConnectionRefs = useConnectionRefsWithKeysByConnectorId(AgentUtils.AgentConnectorId);

  const {
    data: connections,
    isLoading: isLoadingConnections,
    error: connectionsError,
    isError: isErrorConnections,
    refetch: refetchConnections,
  } = useConnectionsForConnector(AgentUtils.AgentConnectorId);

  const saveSelectionCallback = useCallback(
    (connection?: Connection) => {
      if (!connection) {
        return;
      }
      // Find the connection reference key that matches this connection
      const [matchingRefKey, matchingRef] = Object.entries(agentConnectionRefs).find(([_, ref]) =>
        equals(ref.connection.id, connection.id, true)
      ) ?? [null, null];
      if (!matchingRefKey || !matchingRef) {
        return;
      }

      // Detect model type
      const taggedType = connection.properties?.connectionParameters?.agentModelType?.type;
      const agentModelType =
        taggedType && AgentUtils.DisplayNameToManifestValue[taggedType]
          ? AgentUtils.DisplayNameToManifestValue[taggedType]
          : detectAgentModelType(connection, matchingRef);

      dispatch(
        finishSelectConnection({
          connectionReferenceKey: matchingRefKey,
          agentModelType,
        })
      );
    },
    [agentConnectionRefs, dispatch]
  );

  const cancelSelectionCallback = useCallback(() => {
    dispatch(cancelSelectConnection());
  }, [dispatch]);

  const onCreateConnectionSelected = useCallback(() => {
    setIsCreatingConnection(true);
  }, []);

  const updateConnectionInState = useCallback(
    (payload: CreatedConnectionPayload) => {
      dispatch(
        changeConnectionMappingsForNodes({
          nodeIds: [],
          connectorId: payload.connector.id,
          connectionId: payload.connection.id,
          connectionProperties: payload.connectionProperties,
          authentication: payload.authentication,
          connectionRuntimeUrl: payload.connection.properties?.connectionRuntimeUrl,
        })
      );
    },
    [dispatch]
  );

  const onConnectionCreated = useCallback(
    (_: Connection) => {
      setIsCreatingConnection(false);
      refetchConnections();
    },
    [refetchConnections]
  );

  if (isLoadingConnections) {
    return (
      <div className={styles.panelRoot}>
        <div className={styles.loadingContainerFull}>
          <Spinner size="medium" label="Loading connections..." />
        </div>
      </div>
    );
  }

  if (isCreatingConnection) {
    return (
      <div className={styles.panelRoot}>
        <div className={styles.panelHeader}>
          <Text size={400} weight="semibold" as="h2">
            Create Agent Connection
          </Text>
        </div>
        <div className={styles.formContent}>
          <CreateConnectionInternal
            connectorId={AgentUtils.AgentConnectorId}
            operationType="Agent"
            existingReferences={Object.keys(connectionRefs)}
            hideCancelButton={false}
            showActionBar={false}
            updateConnectionInState={updateConnectionInState}
            onConnectionCreated={onConnectionCreated}
            onConnectionCancelled={() => setIsCreatingConnection(false)}
            connectionMetadata={agentConnectionMetadata}
            operationManifest={agentloopManifest}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panelRoot}>
      <div className={styles.panelHeader}>
        <Text size={400} weight="semibold" as="h2">
          Select Agent Connection
        </Text>
      </div>
      <div className={styles.formContent}>
        <SelectConnection
          connections={connections}
          currentConnectionId={undefined}
          saveSelectionCallback={saveSelectionCallback}
          cancelSelectionCallback={cancelSelectionCallback}
          isXrmConnectionReferenceMode={false}
          addButton={{
            text: 'Create new connection',
            disabled: false,
            onAdd: onCreateConnectionSelected,
          }}
          cancelButton={{ onCancel: cancelSelectionCallback }}
          errorMessage={isErrorConnections ? parseErrorMessage(connectionsError) : undefined}
        />
      </div>
    </div>
  );
};
