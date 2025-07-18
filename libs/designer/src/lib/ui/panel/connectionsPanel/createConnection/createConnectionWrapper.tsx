import type { AppDispatch, RootState } from '../../../../core';
import { useOperationInfo } from '../../../../core';
import { closeConnectionsFlow, getConnectionMetadata, updateNodeConnection } from '../../../../core/actions/bjsworkflow/connections';
import { useConnectorByNodeId } from '../../../../core/state/connection/connectionSelector';
import {
  useConnectionPanelSelectedNodeIds,
  useOperationPanelSelectedNodeId,
  usePreviousPanelMode,
} from '../../../../core/state/panel/panelSelectors';
import { useOperationManifest } from '../../../../core/state/selectors/actionMetadataSelector';
import { getAssistedConnectionProps } from '../../../../core/utils/connectors/connections';
import { getRecordEntry, guid, type Connection, type Connector } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ApiHubAuthentication } from '../../../../common/models/workflow';
import { CreateConnectionInternal } from './createConnectionInternal';
import { updateParameterAndDependencies } from '../../../../core/utils/parameters/helper';
import { useIsAgentSubGraph } from '../../../../common/hooks/agent';

export const CreateConnectionWrapper = () => {
  const dispatch = useDispatch<AppDispatch>();

  const nodeId: string = useOperationPanelSelectedNodeId();
  const isAgentSubgraph = useIsAgentSubGraph(nodeId);
  const nodeIds = useConnectionPanelSelectedNodeIds();
  const connector = useConnectorByNodeId(nodeId);
  const operationInfo = useOperationInfo(nodeId);
  const { data: operationManifest } = useOperationManifest(operationInfo);
  const connectionMetadata = getConnectionMetadata(operationManifest);
  const hasExistingConnection = useSelector((state: RootState) => !!getRecordEntry(state.connections.connectionsMapping, nodeId));
  const { nodeInputs, dependencies } = useSelector((state: RootState) => ({
    nodeInputs: state.operations.inputParameters[nodeId],
    dependencies: state.operations.dependencies[nodeId],
  }));

  const existingReferences = useSelector((state: RootState) => Object.keys(state.connections.connectionReferences));
  const connectionReference = useSelector((state: RootState) => state.connections.connectionReferences[nodeId]);

  const assistedConnectionProps = useMemo(
    () => (connector ? getAssistedConnectionProps(connector, operationManifest) : undefined),
    [connector, operationManifest]
  );

  const referencePanelMode = usePreviousPanelMode();
  const updateConnectionInState = useCallback(
    (payload: CreatedConnectionPayload) => {
      for (const nodeId of nodeIds) {
        dispatch(updateNodeConnection({ ...payload, nodeId }));
      }
    },
    [dispatch, nodeIds]
  );

  const updateOperationParameterValues = useCallback(
    (values?: Record<string, any>) => {
      if (values) {
        const groupId = 'default'; // Assuming 'default' is the groupId for operation parameters
        for (const [key, parameterValue] of Object.entries(values)) {
          const parameter = nodeInputs.parameterGroups[groupId].parameters.find((param) => param.parameterName === key);

          if (parameter?.id) {
            dispatch(
              updateParameterAndDependencies({
                nodeId: nodeId,
                nodeInputs,
                dependencies,
                groupId,
                isTrigger: false,
                parameterId: parameter.id,
                operationInfo: operationInfo,
                properties: {
                  value: [
                    {
                      id: guid(),
                      value: parameterValue,
                      type: 'literal',
                    },
                  ],
                },
                connectionReference: connectionReference,
              })
            );
          }
        }
      }
    },
    [connectionReference, dependencies, dispatch, nodeId, nodeInputs, operationInfo]
  );

  return (
    <CreateConnectionInternal
      connectorId={connector?.id ?? ''}
      operationType={operationInfo?.type}
      existingReferences={existingReferences}
      isAgentSubgraph={isAgentSubgraph ?? false}
      nodeIds={nodeIds}
      assistedConnectionProps={assistedConnectionProps}
      connectionMetadata={connectionMetadata}
      showActionBar={true}
      hideCancelButton={!hasExistingConnection}
      updateConnectionInState={updateConnectionInState}
      onConnectionCreated={() => dispatch(closeConnectionsFlow({ nodeId, panelMode: referencePanelMode }))}
      updateOperationParameterValues={updateOperationParameterValues}
    />
  );
};

export interface CreatedConnectionPayload {
  connector: Connector;
  connection: Connection;
  connectionProperties?: Record<string, any>;
  authentication?: ApiHubAuthentication;
}
