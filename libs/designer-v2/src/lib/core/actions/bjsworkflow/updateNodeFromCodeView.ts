import { getTriggerNodeId, type RootState } from '../..';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { OperationManifestService, getRecordEntry } from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { setIsPanelLoading } from '../../state/panel/panelSlice';
import { initializeNodes } from '../../state/operation/operationMetadataSlice';
import { initializeTokensAndVariables } from '../../state/tokens/tokensSlice';
import { replaceOperationDefinition } from '../../state/workflow/workflowSlice';
import { isManagedMcpOperation } from '../../state/workflow/helper';
import { isTriggerNode } from '../../utils/graph';
import Constants from '../../../common/constants';
import { initializeConnectorOperationDetails } from './agent';
import { updateAllUpstreamNodes } from './initialize';
import {
  initializeDynamicDataInNodes,
  initializeOperationDetailsForManagedMcpServer,
  initializeOperationDetailsForManifest,
  initializeOutputTokensForOperations,
  initializeRepetitionInfos,
  initializeVariables,
  updateTokenMetadataInParameters,
  type NodeDataWithOperationMetadata,
} from './operationdeserializer';
import { initializeOperationDetailsForSwagger } from '../../utils/swagger/operation';

export interface UpdateNodeFromCodeViewPayload {
  nodeId: string;
  serializedOperation: LogicAppsV2.OperationDefinition;
}

/**
 * Applies an edited single-operation definition (from the per-action Code view) back into
 * the designer state. Only the edited node is re-initialized; other nodes (and their
 * unsaved edits) are left untouched.
 *
 * Changes to the edited node's `runAfter` are reconciled into the graph (via
 * replaceOperationDefinition) so the node's position updates. Other structural changes
 * (renaming the action key, adding or removing child actions, re-nesting into a different
 * scope) are NOT applied here -- those still require the whole-workflow code view.
 */
export const updateNodeFromCodeView = createAsyncThunk(
  'updateNodeFromCodeView',
  async (payload: UpdateNodeFromCodeViewPayload, { dispatch, getState }): Promise<void> => {
    const { nodeId, serializedOperation } = payload;
    const state = getState() as RootState;

    if (!getRecordEntry(state.workflow.operations, nodeId)) {
      return;
    }

    dispatch(setIsPanelLoading(true));
    try {
      // Persist the new definition so serialization/runAfter fallbacks stay in sync.
      dispatch(replaceOperationDefinition({ nodeId, operationDefinition: serializedOperation }));

      const updatedState = getState() as RootState;
      const { operations, nodesMetadata, workflowKind, graph } = updatedState.workflow;
      const references = updatedState.connections.connectionReferences;
      const workflowParameters = updatedState.workflowParameters.definitions;
      const isTrigger = isTriggerNode(nodeId, nodesMetadata);
      const triggerNodeId = getTriggerNodeId(updatedState.workflow);

      const operationManifestService = OperationManifestService();
      let nodeData: NodeDataWithOperationMetadata[] | undefined;
      if (isManagedMcpOperation(serializedOperation)) {
        nodeData = await initializeOperationDetailsForManagedMcpServer(nodeId, serializedOperation, references, workflowKind, dispatch);
      } else if (serializedOperation.type === Constants.NODE.TYPE.CONNECTOR) {
        nodeData = await initializeConnectorOperationDetails(
          nodeId,
          serializedOperation as LogicAppsV2.ConnectorAction,
          workflowKind,
          dispatch
        );
      } else if (operationManifestService.isSupported(serializedOperation.type, serializedOperation.kind)) {
        nodeData = await initializeOperationDetailsForManifest(
          nodeId,
          serializedOperation,
          {} /* customCode */,
          isTrigger,
          workflowKind,
          dispatch
        );
      } else {
        nodeData = await initializeOperationDetailsForSwagger(nodeId, serializedOperation, references, isTrigger, workflowKind, dispatch);
      }

      if (!nodeData || nodeData.length === 0) {
        return;
      }

      const repetitionInfos = await initializeRepetitionInfos(triggerNodeId, operations, nodeData, nodesMetadata);
      updateTokenMetadataInParameters(nodeData, operations, workflowParameters, nodesMetadata, triggerNodeId, repetitionInfos);

      dispatch(
        initializeNodes({
          nodes: nodeData.map((data) => {
            const { id, nodeInputs, nodeOutputs, nodeDependencies, settings, operationMetadata, staticResult, supportedChannels } = data;
            return {
              id,
              nodeInputs,
              nodeOutputs,
              nodeDependencies,
              settings,
              operationMetadata,
              staticResult,
              supportedChannels,
              actionMetadata: getRecordEntry(nodesMetadata, id)?.actionMetadata,
              repetitionInfo: getRecordEntry(repetitionInfos, id),
            };
          }),
          clearExisting: false,
        })
      );

      const singleOperation = { [nodeId]: serializedOperation };
      const outputTokens = graph ? initializeOutputTokensForOperations(nodeData, singleOperation, graph, nodesMetadata) : {};
      const variables = initializeVariables(singleOperation, nodeData);
      dispatch(initializeTokensAndVariables({ outputTokens, variables }));

      await initializeDynamicDataInNodes(getState as () => RootState, dispatch, [nodeId]);
      updateAllUpstreamNodes(getState() as RootState, dispatch);
    } finally {
      dispatch(setIsPanelLoading(false));
    }
  }
);
