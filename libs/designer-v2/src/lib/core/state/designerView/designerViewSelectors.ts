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
    // Standard SKU: Check workflowKind
    if (equals(state.workflow.workflowKind, 'agent', false)) {
      return true;
    }

    // Consumption SKU: Check definition metadata for agentType = "conversational"
    const agentType = state.workflow.originalDefinition?.metadata?.agentType;
    return equals(agentType, 'conversational', false);
  });
};

export const useWorkflowHasAgentLoop = () => {
  return useSelector((state: RootState) => {
    return Object.values(state.workflow.nodesMetadata).some((node) => node.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION);
  });
};
