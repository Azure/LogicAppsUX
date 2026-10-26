import { createWorkflowLoaderSlice } from '../../shared/state/createWorkflowLoaderSlice';

export type { WorkflowLoadingState } from '../../shared/state/createWorkflowLoaderSlice';

export const workflowLoaderSlice = createWorkflowLoaderSlice(true);

export const { setResourcePath, setAppid, setWorkflowName, clearWorkflowDetails, setHostingPlan, setToolboxOpen } =
  workflowLoaderSlice.actions;

export default workflowLoaderSlice.reducer;
