/** Serialized model identity; never infer a deployment from a display name. */
export const getScopeModel = (operation: unknown): string | undefined => {
  if (!operation || typeof operation !== 'object' || !('inputs' in operation)) {
    return undefined;
  }
  const inputs = operation.inputs;
  if (!inputs || typeof inputs !== 'object' || !('parameters' in inputs)) {
    return undefined;
  }
  const parameters = inputs.parameters;
  const model = parameters && typeof parameters === 'object' && 'deploymentId' in parameters ? parameters.deploymentId : undefined;
  return typeof model === 'string' && model.length > 0 ? model : undefined;
};
