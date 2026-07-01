import { equals } from '@microsoft/logic-apps-shared';
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../store';
import { useSelector } from 'react-redux';
import { isA2AWorkflow } from '../workflow/helper';

export const useShowMinimap = () => {
  return useSelector((state: RootState) => state.designerView.showMinimap);
};

export const useClampPan = () => {
  return useSelector((state: RootState) => state.designerView.clampPan);
};

export const useShowDeleteModalNodeId = () => {
  return useSelector((state: RootState) => state.designerView.showDeleteModalNodeId);
};

export const useShowMultiSelectDeleteModal = () => {
  return useSelector((state: RootState) => state.designerView.showMultiSelectDeleteModal ?? false);
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

const selectIsA2AWorkflow = createSelector(
  (state: RootState) => state.workflow,
  (workflow) => isA2AWorkflow(workflow)
);

export const useIsA2AWorkflow = () => {
  return useSelector(selectIsA2AWorkflow);
};

const selectWorkflowHasAgentLoop = createSelector(
  (state: RootState) => state.workflow.operations,
  (operations) => Object.values(operations).some((operation) => equals(operation.type, 'agent'))
);

export const useWorkflowHasAgentLoop = () => {
  return useSelector(selectWorkflowHasAgentLoop);
};
