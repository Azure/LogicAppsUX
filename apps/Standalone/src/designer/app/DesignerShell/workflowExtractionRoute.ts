export interface WorkflowExtractionRoute {
  enabled: boolean;
  localWorkflow: string | null;
}

export const getWorkflowExtractionRoute = (search: string): WorkflowExtractionRoute => {
  const params = new URLSearchParams(search);
  const enabled = params.get('extraction') === 'true';
  return {
    enabled,
    localWorkflow: enabled ? params.get('local') : null,
  };
};
