export function getResourceGroupFromWorkflowId(workflowID: string): string {
  const separators = workflowID.split('/');
  const resourceGroupLocation = 4;
  return separators?.[resourceGroupLocation];
}
