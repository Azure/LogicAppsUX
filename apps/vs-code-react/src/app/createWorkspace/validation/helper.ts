export const nameValidation = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i;
export const namespaceValidation = /^([A-Za-z_][A-Za-z0-9_]*)(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
/**
 * Validation regex for C# function names.
 * Unlike nameValidation, this does NOT allow hyphens because hyphens are invalid
 * in C# identifiers (class names, method names, namespaces).
 * Must start with a letter and contain only letters, digits, and underscores.
 */
export const functionNameValidation = /^[a-z][a-z\d_]*$/i;
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
    return intlText.FUNCTION_NAMESPACE_EMPTY ?? 'Function namespace cannot be empty.';
  }
  if (!namespaceValidation.test(namespace)) {
    return (
      intlText.FUNCTION_NAMESPACE_VALIDATION ??
      intlText.FUNCTION_NAMESPACE_VALIDATION_MESSAGE ??
      'Function namespace must be a valid C# namespace.'
    );
  }
  return undefined;
};

export const validateFunctionName = (name: string, intlText: any) => {
  if (!name) {
    return intlText.FUNCTION_NAME_EMPTY ?? 'Function name cannot be empty.';
  }
  if (!functionNameValidation.test(name)) {
    return (
      intlText.FUNCTION_NAME_VALIDATION ??
      intlText.FUNCTION_NAME_VALIDATION_MESSAGE ??
      'Function name must start with a letter and can only contain letters, digits, and underscores ("_").'
    );
  }
  return undefined;
};
