import { agentOperation, type OperationManifest, handoffOperation } from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { changePanelNode, type RootState } from '../..';
import { getOperationManifest } from '../../queries/operation';
import { initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import { getWorkflowNodeFromGraphState } from '../../state/workflow/workflowSelectors';
import { addAgentTool, addNode, addHandoffMetadata, deleteAgentTool, removeHandoffMetadata } from '../../state/workflow/workflowSlice';
import { batch } from 'react-redux';
import { initializeSubgraphFromManifest, initializeOperationDetails } from './add';
import { deleteGraphNode } from './delete';
import { setSelectedPanelActiveTab } from '../../../core/state/panel/panelSlice';
import Constants from '../../../common/constants';

type AddAgentHandoffPayload = {
  sourceId: string;
  targetId: string;
};

export const addAgentHandoff = createAsyncThunk('addAgentHandoff', async (payload: AddAgentHandoffPayload, { dispatch, getState }) => {
  batch(async () => {
    const { sourceId, targetId } = payload;

    const agentManifest = await getOperationManifest({
      connectorId: agentOperation.properties.api.id,
      operationId: agentOperation.id,
    });

    const newHandoffId = `handoff_${sourceId}_${targetId}`;
    const newToolId = `${newHandoffId}_tool`;

    // Initialize subgraph manifest
    const caseManifestData = Object.values(agentManifest?.properties?.subGraphDetails ?? {}).find((data) => data.isAdditive);
    const subgraphManifest: OperationManifest = {
      properties: {
        ...caseManifestData,
        iconUri: agentManifest?.properties.iconUri ?? '',
        brandColor: '',
      },
    };
    initializeSubgraphFromManifest(newToolId, subgraphManifest, dispatch);

    // Create a new tool for the handoff
    dispatch(
      addAgentTool({
        toolId: newToolId,
        graphId: sourceId,
      })
    );

    // Create the handoff action
    dispatch(
      addNode({
        operation: handoffOperation,
        nodeId: newHandoffId,
        relationshipIds: {
          graphId: sourceId,
          subgraphId: newToolId,
          parentId: `${newToolId}-#subgraph`,
        },
      })
    );

    // Add handoff to agent operation data
    dispatch(
      addHandoffMetadata({
        sourceId,
        toolId: newToolId,
        targetId,
      })
    );

    const nodeOperationInfo = {
      connectorId: handoffOperation.properties.api.id,
      operationId: handoffOperation.name,
      type: handoffOperation.type,
    };

    dispatch(initializeOperationInfo({ id: newHandoffId, ...nodeOperationInfo }));
    const presetParameterValues = {
      name: targetId,
    };
    initializeOperationDetails(
      newHandoffId,
      nodeOperationInfo,
      getState as () => RootState,
      dispatch,
      presetParameterValues,
      undefined,
      false
    );

    // Switch to the parent handoff panel to setup the description
    batch(() => {
      dispatch(changePanelNode(sourceId));
      dispatch(setSelectedPanelActiveTab(Constants.PANEL_TAB_NAMES.HANDOFF));
    });
  });
});

type RemoveAgentHandoffPayload = {
  agentId: string;
  toolId: string;
};

export const removeAgentHandoff = createAsyncThunk(
  'removeAgentHandoff',
  async (payload: RemoveAgentHandoffPayload, { dispatch, getState }) => {
    const { agentId, toolId } = payload;
    const toolWorkflowNode = getWorkflowNodeFromGraphState((getState() as RootState).workflow, toolId);
    if (!toolWorkflowNode) {
      return;
    }
    dispatch(
      deleteGraphNode({
        graphId: toolId,
        graphNode: toolWorkflowNode,
        clearFocus: false,
      })
    );
    dispatch(
      removeHandoffMetadata({
        sourceId: agentId,
        toolId,
      })
    );
    dispatch(
      deleteAgentTool({
        agentId,
        toolId,
      })
    );
  }
);
