import path from 'path';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';
import { autoRuntimeDependenciesPathSettingKey, defaultDependencyPathValue, localSettingsFileName, lspDirectory, workflowCodefulEnabledKey } from '../../constants';
import { ext } from '../../extensionVariables';
import { getGlobalSetting } from './vsCodeConfig/settings';

const codefulSdkPackageId = 'Microsoft.Azure.Workflows.Sdk';
const codefulSdkPackageVersion = '1.0.0-preview.1';
const lspSdkHashMarkerName = '.lspsdk-hash';
const codefulSdkProjectHashMarkerName = '.logicapps-lspsdk-hash';

/**
 * Checks whether any workspace folder contains a codeful Logic Apps project.
 */
export async function codefulProjectsExist(): Promise<boolean> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return false;
  }

  for (const folder of workspaceFolders) {
    if (await hasCodefulWorkflowSetting(folder.uri.fsPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if the codeful agent is enabled for a given folder by examining the local settings file.
 * @param folderPath - The path to the folder containing the local settings file
 * @returns A promise that resolves to true if the codeful agent is enabled, false otherwise
 */
export const hasCodefulWorkflowSetting = async (folderPath: string): Promise<boolean> => {
  const localSettingsFilePath = path.join(folderPath, localSettingsFileName);
  if (!(await fse.pathExists(localSettingsFilePath))) {
    return false;
  }

  try {
    const localSettingsData = await fse.readFile(localSettingsFilePath, 'utf-8');
    const localSettings = JSON.parse(localSettingsData);
    return localSettings.Values?.[workflowCodefulEnabledKey] === 'true';
  } catch {
    return false;
  }
};

/**
 * Checks if the folder contains a .NET 8 project with a reference to the codeful SDK.
 * @param {string} folderPath - The folder path.
 * @returns {Promise<boolean>} Returns true if the folder contains a .NET 8 project with a reference to the codeful SDK, otherwise false.
 */
export const hasCodefulSdkReference = async (folderPath: string): Promise<boolean> => {
  try {
    if (!fse.statSync(folderPath).isDirectory()) {
      return false;
    }
  } catch {
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
 * Invalidates only the project-local cache entry for the extension-shipped codeful SDK
 * when the VSIX ships changed nupkg bits with the same package ID/version.
 */
export const invalidateCodefulSdkCacheIfNeeded = async (projectPath: string): Promise<boolean> => {
  if (!(await hasCodefulWorkflowSetting(projectPath))) {
    return false;
  }

  const targetDirectory = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey) || defaultDependencyPathValue;
  const lspDirectoryPath = path.join(targetDirectory, lspDirectory);
  const nugetConfigPath = path.join(projectPath, 'nuget.config');
  const installedSdkHashMarkerPath = path.join(targetDirectory, lspSdkHashMarkerName);

  if (
    !(await fse.pathExists(installedSdkHashMarkerPath)) ||
    !(await fse.pathExists(nugetConfigPath)) ||
    !(await codefulNugetConfigUsesExtensionSdkCache(nugetConfigPath, projectPath, lspDirectoryPath))
  ) {
    return false;
  }

  const installedSdkHash = (await fse.readFile(installedSdkHashMarkerPath, 'utf-8')).trim();
  if (!installedSdkHash) {
    return false;
  }

  const projectNugetFolder = path.join(projectPath, '.nuget');
  const projectSdkHashMarkerPath = path.join(projectNugetFolder, codefulSdkProjectHashMarkerName);
  const projectSdkPackagePath = path.join(projectNugetFolder, 'packages', codefulSdkPackageId.toLowerCase(), codefulSdkPackageVersion);
  const restoreNoOpCachePaths = [
    path.join(projectPath, 'obj', 'project.assets.json'),
    path.join(projectPath, 'obj', 'project.nuget.cache'),
  ];

  if ((await readTrimmedFileIfExists(projectSdkHashMarkerPath)) === installedSdkHash) {
    return false;
  }

  if (await fse.pathExists(projectSdkPackagePath)) {
    await fse.remove(projectSdkPackagePath);
    ext.outputChannel.appendLog(
      `Removed stale ${codefulSdkPackageId} ${codefulSdkPackageVersion} from project-local NuGet cache at ${projectSdkPackagePath}.`
    );
  }

  await Promise.all(restoreNoOpCachePaths.map((cachePath) => removeIfExists(cachePath)));
  await fse.ensureDir(projectNugetFolder);
  await fse.writeFile(projectSdkHashMarkerPath, installedSdkHash);
  return true;
};

async function removeIfExists(filePath: string): Promise<void> {
  if (await fse.pathExists(filePath)) {
    await fse.remove(filePath);
  }
}

async function readTrimmedFileIfExists(filePath: string): Promise<string | undefined> {
  if (!(await fse.pathExists(filePath))) {
    return undefined;
  }

  try {
    return (await fse.readFile(filePath, 'utf-8')).trim();
  } catch {
    return undefined;
  }
}

async function codefulNugetConfigUsesExtensionSdkCache(
  nugetConfigPath: string,
  projectPath: string,
  lspDirectoryPath: string
): Promise<boolean> {
  const nugetConfig = await fse.readFile(nugetConfigPath, 'utf-8');
  const globalPackagesFolder = getXmlAddValue(nugetConfig, 'config', 'globalPackagesFolder');
  const currentSource = getXmlAddValue(nugetConfig, 'packageSources', 'current');

  return (
    globalPackagesFolder !== undefined &&
    normalizeNugetPath(projectPath, globalPackagesFolder) === normalizeNugetPath(projectPath, '.nuget\\packages') &&
    currentSource !== undefined &&
    normalizeNugetPath(projectPath, currentSource) === normalizeNugetPath(projectPath, lspDirectoryPath)
  );
}

function getXmlAddValue(xml: string, sectionName: string, key: string): string | undefined {
  const sectionMatch = stripXmlComments(xml).match(new RegExp(`<${sectionName}\\b[^>]*>([\\s\\S]*?)<\\/${sectionName}>`, 'i'));
  const addElement = sectionMatch?.[1].match(new RegExp(`<add\\b(?=[^>]*\\bkey=["']${escapeRegExp(key)}["'])[^>]*>`, 'i'))?.[0];
  return addElement?.match(/\bvalue=["']([^"']*)["']/i)?.[1];
}

function stripXmlComments(xml: string): string {
  // This skips XML comments in local project files before regex parsing; it is not HTML output sanitization.
  let result = '';
  let currentIndex = 0;

  while (currentIndex < xml.length) {
    const commentStart = xml.indexOf('<!--', currentIndex);
    if (commentStart === -1) {
      return result + xml.slice(currentIndex);
    }

    result += xml.slice(currentIndex, commentStart);
    const commentEnd = xml.indexOf('-->', commentStart + '<!--'.length);
    if (commentEnd === -1) {
      return result + xml.slice(commentStart);
    }

    currentIndex = commentEnd + '-->'.length;
  }

  return result;
}

function normalizeNugetPath(projectPath: string, nugetPath: string): string {
  const unquotedPath = nugetPath.trim().replace(/^["']|["']$/g, '');
  const resolvedPath = path.isAbsolute(unquotedPath) ? unquotedPath : path.resolve(projectPath, unquotedPath);
  return path.normalize(resolvedPath).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
 * Information about the AfterTargets hooks on the codeful project's
 * `CopyToCodefulFolder` and `ReplaceLanguageNetCore` MSBuild targets.
 *
 * Modern codeful project templates run both targets `AfterTargets="Build;Publish"`,
 * which means a plain Debug `Build` is sufficient to populate `lib/codeful` and
 * to perform the `worker.config.json` `dotnet-isolated` -> `dotnet` rewrite.
 * Legacy templates (`AfterTargets="Publish"` only) require an explicit `publish`
 * task before the local debug host can run.
 */
export interface CodefulCsprojBuildHookInfo {
  /** Raw `AfterTargets` attribute value for `CopyToCodefulFolder`, or `null` when the target is absent. */
  copyAfterTargets: string | null;
  /** Raw `AfterTargets` attribute value for `ReplaceLanguageNetCore`, or `null` when the target is absent. */
  replaceLangAfterTargets: string | null;
  /**
   * True iff BOTH targets have `Build` as a semicolon-separated token in their
   * `AfterTargets`. When true, a Debug `Build` alone is expected to produce
   * a runnable `lib/codeful` and the explicit `publish` task can be skipped
   * for local debug.
   */
  runsOnBuild: boolean;
}

const findTargetAfterTargets = (csprojContent: string, targetName: string): string | null => {
  const stripped = stripXmlComments(csprojContent);
  const targetTagRegex = /<Target\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = targetTagRegex.exec(stripped)) !== null) {
    const attrs = match[1];
    const nameMatch = attrs.match(/\bName=["']([^"']+)["']/);
    if (nameMatch?.[1] !== targetName) {
      continue;
    }
    const afterTargetsMatch = attrs.match(/\bAfterTargets=["']([^"']+)["']/);
    return afterTargetsMatch?.[1] ?? '';
  }
  return null;
};

const afterTargetsIncludesBuild = (afterTargets: string | null): boolean => {
  if (!afterTargets) {
    return false;
  }
  return afterTargets
    .split(';')
    .map((token) => token.trim())
    .includes('Build');
};

/**
 * Parses the codeful project's `.csproj` contents to determine whether the
 * `CopyToCodefulFolder` and `ReplaceLanguageNetCore` MSBuild targets run as
 * part of `Build` (in addition to `Publish`).
 *
 * Used by the debug F5 pipeline to decide whether the explicit Release
 * `publish` task can be skipped — a plain Debug `Build` populates the same
 * `lib/codeful` output for modern templates.
 *
 * @param csprojContent - Raw contents of the `.csproj` file.
 * @returns Hook info; `runsOnBuild` is true only when both targets hook `Build`.
 */
export const parseCsprojCopyToCodefulInfo = (csprojContent: string): CodefulCsprojBuildHookInfo => {
  const copyAfterTargets = findTargetAfterTargets(csprojContent, 'CopyToCodefulFolder');
  const replaceLangAfterTargets = findTargetAfterTargets(csprojContent, 'ReplaceLanguageNetCore');
  const runsOnBuild = afterTargetsIncludesBuild(copyAfterTargets) && afterTargetsIncludesBuild(replaceLangAfterTargets);
  return { copyAfterTargets, replaceLangAfterTargets, runsOnBuild };
};

/**
 * Reads the codeful project's `.csproj` from `folderPath` and parses its
 * build-hook info. Returns `null` when no `.csproj` file is present.
 */
export const inspectCodefulCsprojBuildHooks = async (folderPath: string): Promise<CodefulCsprojBuildHookInfo | null> => {
  try {
    if (!fse.statSync(folderPath).isDirectory()) {
      return null;
    }
  } catch {
    return null;
  }
  const files = await fse.readdir(folderPath);
  const csprojFile = files.find((file) => file.endsWith('.csproj'));
  if (!csprojFile) {
    return null;
  }
  const content = await fse.readFile(path.join(folderPath, csprojFile), 'utf-8');
  return parseCsprojCopyToCodefulInfo(content);
};

/**
 * Detects if a C# file contains a CreateStatefulWorkflow call and extracts the workflow name.
 * @param fileContent - The content of the C# file
 * @returns The workflow name if detected, undefined otherwise
 */
export const detectStatefulCodefulWorkflow = (fileContent: string): string | undefined => {
  // Pattern to match: WorkflowBuilderFactory.CreateStatefulWorkflow(<workflowName>, ...)
  // or WorkflowFactory.CreateStatefulWorkflow(<workflowName>, ...)
  // This handles: variables, string literals, template placeholders like <%= flowName %>
  // Using [\s\S]*? to match across line breaks
  const pattern = /Workflow(?:Builder)?Factory[\s\S]*?\.CreateStatefulWorkflow\s*\(\s*([^,)]+)/;
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
  // or WorkflowFactory.CreateAgentWorkflow(<workflowName>, ...)
  // This handles: variables, string literals, template placeholders like <%= flowName %>
  // Using [\s\S]*? to match across line breaks
  const pattern =
    /(?:WorkflowBuilderFactory[\s\S]*?\.CreateConversationalAgent|WorkflowFactory[\s\S]*?\.CreateAgentWorkflow)\s*\(\s*([^,)]+)/;
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
