import { equals, SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useShowMinimap = () => {
  return useSelector((state: RootState) => state.designerView.showMinimap);
};

export const useClampPan = () => {
  return useSelector((state: RootState) => state.designerView.clampPan);
};

export const useShowDeleteModalNodeId = () => {
  return useSelector((state: RootState) => state.designerView.showDeleteModalNodeId);
};

export const useNodeContextMenuData = () => {
  return useSelector((state: RootState) => state.designerView.nodeContextMenuData);
};

export const useEdgeContextMenuData = () => {
  return useSelector((state: RootState) => state.designerView.edgeContextMenuData);
};

export const useIsAgenticWorkflow = () => {
  const workflowKind = useSelector((state: RootState) => state.workflow.workflowKind);
  return equals(workflowKind, 'agentic', true) || equals(workflowKind, 'stateful', true);
};

// Temporary hook for backwards compatibility with agentic wf, TODO: delete once stateful is merged in
export const useIsAgenticWorkflowOnly = () => {
  const workflowKind = useSelector((state: RootState) => state.workflow.workflowKind);
  return equals(workflowKind, 'agentic', true);
};

export const useIsA2AWorkflow = () => {
  return useSelector((state: RootState) => {
    const workflowKind = state.workflow.workflowKind;

    // Standard SKU, kind is agent
    if (equals(workflowKind, 'agent', false)) {
      return true;
    }

    // Standard SKU, kind is not agent
    if (workflowKind && !equals(workflowKind, 'agent', false)) {
      return false;
    }

    // Consumption SKU, check definition metadata
    const agentType = state.workflow.originalDefinition?.metadata?.agentType;
    const isConsumptionAgent = equals(agentType, 'conversational', false);

    // Also check if workflow has Agent operations (fallback for Consumption workflows without metadata)
    const hasAgentOperations = Object.values(state.workflow.operations).some((operation) => equals(operation.type, 'Agent', true));

    return isConsumptionAgent || hasAgentOperations;
  });
};

export const useWorkflowHasAgentLoop = () => {
  return useSelector((state: RootState) => {
    return Object.values(state.workflow.nodesMetadata).some((node) => node.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION);
  });
};
