import { equals, SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../store';
import { useSelector } from 'react-redux';
import { isA2AWorkflow } from '../workflow/helper';

// Re-export view hooks from context (these no longer use Redux)
export {
  useShowMinimap,
  useClampPan,
  useShowDeleteModalNodeId,
  useNodeContextMenuData,
  useEdgeContextMenuData,
} from './DesignerViewContext';

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
  return useSelector((state: RootState) => isA2AWorkflow(state.workflow));
};

export const useWorkflowHasAgentLoop = () => {
  return useSelector((state: RootState) => {
    return Object.values(state.workflow.nodesMetadata).some((node) => node.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION);
  });
};
