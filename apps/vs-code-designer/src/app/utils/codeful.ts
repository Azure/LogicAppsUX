import path from 'path';
import * as fse from 'fs-extra';
import { localSettingsFileName } from '../../constants';

/**
 * Checks if the codeful agent is enabled for a given folder by examining the local settings file.
 * @param folderPath - The path to the folder containing the local settings file
 * @returns A promise that resolves to true if the codeful agent is enabled, false otherwise
 * @remarks
 * This function reads the local settings file (typically local.settings.json) from the specified
 * folder path and checks for the WORKFLOW_CODEFUL_ENABLED flag in the Values section.
 * Returns false if the file doesn't exist, cannot be read, or doesn't contain valid JSON.
 */
export const hasCodefulWorkflowSetting = async (folderPath: string): Promise<boolean> => {
  const localSettingsFilePath = path.join(folderPath, localSettingsFileName);
  if (!(await fse.pathExists(localSettingsFilePath))) {
    return false;
  }

  try {
    const localSettingsData = await fse.readFile(localSettingsFilePath, 'utf-8');
    const localSettings = JSON.parse(localSettingsData);
    return localSettings.Values?.WORKFLOW_CODEFUL_ENABLED ? true : false;
  } catch {
    return false;
  }
};

/**
 * Checks if the folder is a custom code functions project.
 * @param {string} folderPath - The folder path.
 * @returns {Promise<boolean>} Returns true if the folder is a custom code functions project, otherwise false.
 */
export const isCodefulProject = async (folderPath: string): Promise<boolean> => {
  if (!fse.statSync(folderPath).isDirectory()) {
    return false;
  }
  const files = await fse.readdir(folderPath);
  const csprojFile = files.find((file) => file.endsWith('.csproj'));
  if (!csprojFile) {
    return false;
  }

  const csprojContent = await fse.readFile(path.join(folderPath, csprojFile), 'utf-8');
  return isCodefulNet8Csproj(csprojContent);
};

/**
 * Checks if a C# project file (.csproj) is configured for a codeful .NET 8 Azure Logic Apps workflow.
 *
 * @param csprojContent - The content of the .csproj file as a string
 * @returns `true` if the project targets .NET 8 and includes the Microsoft.Azure.Workflows.Sdk package, `false` otherwise
 */
const isCodefulNet8Csproj = (csprojContent: string): boolean => {
  return csprojContent.includes('<TargetFramework>net8</TargetFramework>') && csprojContent.includes('Microsoft.Azure.Workflows.Sdk');
};

/**
 * Detects if a C# file contains a CreateStatefulWorkflow call and extracts the workflow name.
 * @param fileContent - The content of the C# file
 * @returns The workflow name if detected, undefined otherwise
 */
export const detectStatefulCodefulWorkflow = (fileContent: string): string | undefined => {
  // Pattern to match: WorkflowBuilderFactory.CreateStatefulWorkflow(<workflowName>, ...)
  // This handles: variables, string literals, template placeholders like <%= flowName %>
  // Using [\s\S]*? to match across line breaks
  const pattern = /WorkflowBuilderFactory[\s\S]*?\.CreateStatefulWorkflow\s*\(\s*([^,)]+)/;
  const match = fileContent.match(pattern);

  if (match && match[1]) {
    // Extract the workflow name and clean it up (remove quotes, trim whitespace)
    let workflowName = match[1].trim();

    // Remove string quotes if present
    workflowName = workflowName.replace(/^["']|["']$/g, '');

    // If it's a template placeholder like <%= flowName %>, we can't determine the actual name
    // In this case, return undefined since it's a template
    if (workflowName.includes('<%=') || workflowName.includes('%>')) {
      return undefined;
    }

    return workflowName;
  }

  return undefined;
};

/**
 * Detects if a C# file contains a CreateConversationalAgent call and extracts the workflow name.
 * @param fileContent - The content of the C# file
 * @returns The workflow name if detected, undefined otherwise
 */
export const detectAgentCodefulWorkflow = (fileContent: string): string | undefined => {
  // Pattern to match: WorkflowBuilderFactory.CreateConversationalAgent(<workflowName>)
  // This handles: variables, string literals, template placeholders like <%= flowName %>
  // Using [\s\S]*? to match across line breaks
  const pattern = /WorkflowBuilderFactory[\s\S]*?\.CreateConversationalAgent\s*\(\s*([^,)]+)/;
  const match = fileContent.match(pattern);

  if (match && match[1]) {
    // Extract the workflow name and clean it up (remove quotes, trim whitespace)
    let workflowName = match[1].trim();

    // Remove string quotes if present
    workflowName = workflowName.replace(/^["']|["']$/g, '');

    // If it's a template placeholder like <%= flowName %>, we can't determine the actual name
    // In this case, return undefined since it's a template
    if (workflowName.includes('<%=') || workflowName.includes('%>')) {
      return undefined;
    }

    return workflowName;
  }

  return undefined;
};

/**
 * Detects if a C# file is a codeful workflow file and extracts the workflow name.
 * Checks for both stateful and agent workflow patterns.
 * @param fileContent - The content of the C# file
 * @returns An object with the workflow name and type if detected, undefined otherwise
 */
export const detectCodefulWorkflow = (fileContent: string): { workflowName: string; workflowType: 'stateful' | 'agent' } | undefined => {
  const statefulWorkflowName = detectStatefulCodefulWorkflow(fileContent);
  if (statefulWorkflowName) {
    return { workflowName: statefulWorkflowName, workflowType: 'stateful' };
  }

  const agentWorkflowName = detectAgentCodefulWorkflow(fileContent);
  if (agentWorkflowName) {
    return { workflowName: agentWorkflowName, workflowType: 'agent' };
  }

  return undefined;
};

/**
 * Extracts the trigger name from a codeful C# file.
 * Looks for WorkflowTriggers patterns and extracts the trigger name.
 * @param fileContent - The content of the C# file
 * @returns The trigger name if found, undefined otherwise
 */
export const extractTriggerNameFromCodeful = (fileContent: string): string | undefined => {
  // Remove single-line comments (//) and multi-line comments (/* */) to avoid matching commented code
  const uncommentedContent = fileContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
    .replace(/\/\/.*/g, ''); // Remove // comments

  // Look for .WithName("triggerName") pattern which sets the trigger name
  const withNamePattern = /\.WithName\s*\(\s*["']([^"']+)["']\s*\)/;
  const withNameMatch = uncommentedContent.match(withNamePattern);

  if (withNameMatch && withNameMatch[1]) {
    return withNameMatch[1];
  }

  // If no explicit name is set, try to extract from the trigger variable name
  const triggerVarPattern = /var\s+(\w+)\s*=\s*WorkflowTriggers\./;
  const triggerVarMatch = uncommentedContent.match(triggerVarPattern);

  if (triggerVarMatch && triggerVarMatch[1]) {
    return triggerVarMatch[1];
  }

  return undefined;
};

/**
 * Detects if the codeful workflow has an HTTP request trigger.
 * @param fileContent - The content of the C# file
 * @returns true if the workflow has an HTTP request trigger, false otherwise
 */
export const hasHttpRequestTrigger = (fileContent: string): boolean => {
  // Remove single-line comments (//) and multi-line comments (/* */) to avoid matching commented code
  const uncommentedContent = fileContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
    .replace(/\/\/.*/g, ''); // Remove // comments

  return uncommentedContent.includes('WorkflowTriggers.BuiltIn.CreateHttpTrigger');
};

/**
 * Extracts the HTTP trigger name from WorkflowTriggers.BuiltIn.CreateHttpTrigger() call.
 * @param fileContent - The content of the C# file
 * @returns The HTTP trigger name if found, undefined otherwise
 */
export const extractHttpTriggerName = (fileContent: string): string | undefined => {
  // Remove single-line comments (//) and multi-line comments (/* */) to avoid matching commented code
  const uncommentedContent = fileContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
    .replace(/\/\/.*/g, ''); // Remove // comments

  // Pattern to match: WorkflowTriggers.BuiltIn.CreateHttpTrigger("triggerName", ...)
  // Using [\s\S]*? to match any characters including newlines between parts
  const pattern = /WorkflowTriggers[\s\S]*?\.BuiltIn[\s\S]*?\.CreateHttpTrigger\s*\(\s*["']([^"']+)["']/;
  const match = uncommentedContent.match(pattern);

  if (match && match[1]) {
    return match[1];
  }

  // If CreateHttpTrigger() is called without a name parameter, return undefined
  // The caller should query the LSP server to get the SDK-generated default name
  return undefined;
};
