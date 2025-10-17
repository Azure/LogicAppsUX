export const nameValidation = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i;
export const namespaceValidation = /^([A-Za-z_][A-Za-z0-9_]*)(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

export const validateWorkflowName = (name: string, intlText: any) => {
  if (!name) {
    return intlText.EMPTY_WORKFLOW_NAME;
  }
  if (!nameValidation.test(name)) {
    return intlText.WORKFLOW_NAME_VALIDATION_MESSAGE;
  }
  return undefined;
};

export const validateFunctionNamespace = (namespace: string, intlText: any) => {
  if (!namespace) {
    return intlText.EMPTY_FUNCTION_NAMESPACE;
  }
  if (!namespaceValidation.test(namespace)) {
    return intlText.FUNCTION_NAMESPACE_VALIDATION_MESSAGE;
  }
  return undefined;
};

export const validateFunctionName = (name: string, intlText: any) => {
  if (!name) {
    return intlText.EMPTY_FUNCTION_NAME;
  }
  if (!nameValidation.test(name)) {
    return intlText.FUNCTION_NAME_VALIDATION_MESSAGE;
  }
  return undefined;
};
