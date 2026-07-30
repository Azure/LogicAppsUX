import { createWorkflowLoaderSliceWithRunId } from '../../shared/state/createWorkflowLoaderSlice';

export type { WorkflowLoadingState } from '../../shared/state/createWorkflowLoaderSlice';

export const workflowLoaderSlice = createWorkflowLoaderSliceWithRunId();

export const { setResourcePath, setAppid, setWorkflowName, clearWorkflowDetails, setHostingPlan, changeRunId, setToolboxOpen } =
  workflowLoaderSlice.actions;

export default workflowLoaderSlice.reducer;
