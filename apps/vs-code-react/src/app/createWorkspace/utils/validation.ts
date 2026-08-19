import { ProjectType } from '@microsoft/vscode-extension-logic-apps';

export const nameValidation = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i;
export const namespaceValidation = /^([A-Za-z_][A-Za-z0-9_]*)(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
export const functionNameValidation = /^[a-z][a-z\d_]*$/i;

// Reserved folder names that exist in Logic App projects by default.
// Workflows must not use these names to avoid conflicts.
export const reservedWorkflowNames = [
  '.vscode',
  '.debug',
  '.devcontainer',
  '.testResults',
  'Artifacts',
  'lib',
  'workflow-designtime',
  'Tests',
  'diagnostics',
  'locks',
  'wwwroot',
  'custom',
  'DeploymentScriptTemplates',
  'WorkspaceTemplates',
];

const reservedNamesLower = new Set(reservedWorkflowNames.map((n) => n.toLowerCase()));

export const validateWorkflowName = (name: string, intlText: any, existingWorkflows?: string[]) => {
  if (!name) {
    return intlText.EMPTY_WORKFLOW_NAME;
  }
  if (!nameValidation.test(name)) {
    return intlText.WORKFLOW_NAME_VALIDATION_MESSAGE;
  }
  if (reservedNamesLower.has(name.trim().toLowerCase())) {
    return intlText.WORKFLOW_NAME_RESERVED ?? 'This name is reserved and cannot be used as a workflow name.';
  }
  if (existingWorkflows?.some((w) => w.toLowerCase() === name.trim().toLowerCase())) {
    return intlText.WORKFLOW_NAME_EXISTS ?? 'A workflow with this name already exists in the selected project.';
  }
  return undefined;
};

export const validateFunctionNamespace = (namespace: string, intlText: any) => {
  if (!namespace) {
    return intlText.FUNCTION_NAMESPACE_EMPTY;
  }
  if (!namespaceValidation.test(namespace)) {
    return intlText.FUNCTION_NAMESPACE_VALIDATION;
  }
  return undefined;
};

export const validateFunctionName = (name: string, intlText: any) => {
  if (!name) {
    return intlText.FUNCTION_NAME_EMPTY;
  }
  if (!functionNameValidation.test(name)) {
    return intlText.FUNCTION_NAME_VALIDATION;
  }
  return undefined;
};

/**
 * Checks whether the workspace path (parentPath + separator + name) is a strict
 * descendant of the currently open folder. Equal paths are allowed (in-place case).
 * Uses platform-aware comparison for case sensitivity and normalizes trailing separators.
 */
export function isWorkspaceDescendantOfCurrentFolder(
  parentPath: string,
  name: string,
  currentFolderPath: string,
  separator: string,
  platform: string | null = null
): boolean {
  if (!currentFolderPath || !parentPath || !name) {
    return false;
  }
  const workspacePath = joinPath(parentPath, name, separator);
  if (pathsEqual(workspacePath, currentFolderPath, platform)) {
    return false;
  }
  return pathStartsWith(workspacePath, currentFolderPath, separator, platform);
}

// Get validation requirements based on flow type
export function getValidationRequirements(flowType: string, logicAppType: string) {
  const requirements = {
    needsPackagePath: flowType === 'createWorkspaceFromPackage',
    needsWorkspacePath: flowType !== 'createLogicApp',
    needsWorkspaceName: flowType !== 'createLogicApp',
    needsLogicAppType: flowType !== 'ensureWorkspace', // ensureWorkspace doesn't need logic app type
    needsLogicAppName: flowType !== 'ensureWorkspace', // ensureWorkspace doesn't need logic app name
    needsWorkflowFields: false, // ensureWorkspace only needs workspace path and name
    needsFunctionFields: false, // ensureWorkspace doesn't need function fields
  };

  // Override for specific flow types that need more fields
  if (flowType === 'createWorkspace' || flowType === 'createLogicApp') {
    requirements.needsLogicAppType = true;
    requirements.needsLogicAppName = true;
    requirements.needsWorkflowFields = true;
    requirements.needsFunctionFields = logicAppType === ProjectType.customCode || logicAppType === ProjectType.rulesEngine;
  }

  // Override for specific flow types that need more fields
  if (flowType === 'createWorkflow') {
    requirements.needsLogicAppType = false;
    requirements.needsLogicAppName = true;
    requirements.needsWorkspaceName = false;
    requirements.needsWorkspacePath = false;
    requirements.needsWorkflowFields = true;
  }

  return requirements;
}

/**
 * Joins a parent path and a name with the given separator,
 * handling trailing separators on the parent to avoid doubling.
 */
export function joinPath(parentPath: string, name: string, separator: string): string {
  return `${stripTrailingSeparator(parentPath, separator)}${separator}${name}`;
}

/**
 * Compares two path strings with platform-aware case sensitivity.
 * Windows/macOS are case-insensitive; Linux is case-sensitive.
 */
export function pathsEqual(a: string, b: string, platform: string | null): boolean {
  if (platform === 'linux') {
    return a === b;
  }
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Checks whether `child` starts with `parent` + separator, using platform-aware comparison.
 */
function pathStartsWith(child: string, parent: string, separator: string, platform: string | null): boolean {
  const prefix = `${stripTrailingSeparator(parent, separator)}${separator}`;
  if (platform === 'linux') {
    return child.startsWith(prefix);
  }
  return child.toLowerCase().startsWith(prefix.toLowerCase());
}

/**
 * Strips trailing separator(s) from a path string.
 * Preserves root paths like "/" or "C:\".
 */
function stripTrailingSeparator(p: string, sep: string): string {
  while (p.length > 1 && p.endsWith(sep)) {
    p = p.slice(0, -sep.length);
  }
  return p;
}
