/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  ProjectDirectoryPathKey,
  appKindSetting,
  connectionsFileName,
  designTimeDirectoryName,
  extensionBundleId,
  hostFileName,
  localSettingsFileName,
  parametersFileName,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  workerRuntimeKey,
  workflowFileName,
  workflowOperationDiscoveryHostModeKey,
  workflowAuthenticationMethodKey,
  workflowAuthenticationMethodMIValue,
} from '../../constants';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import { isManagedIdentityAuthEnabled, useNodeDesignTimeWorker } from '../utils/vsCodeConfig/settings';
import {
  generateHostJson,
  generateDesignTimeHostJson,
  generateLocalSettingsJson,
  generateDesignTimeLocalSettingsJson,
} from './fileGenerators';
import { addOrUpdateLocalAppSettings, getLocalSettingsJson } from '../utils/appSettings/localSettings';
import { writeFormattedJson } from '../utils/fs';
import { parseJson } from '../utils/parseJson';
import { WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import { type ILocalSettingsJson, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Uri, workspace } from 'vscode';
import { detectProjectType } from '../utils/project';

/**
 * Matches app setting references such as `@appsetting('MY_SETTING')` and the interpolated
 * variant `@{appsetting('MY_SETTING')}`. Both single and double quotes are supported.
 */
const appSettingReferenceRegex = /appsetting\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * App setting keys that must always be present (non-empty) for the design-time local.settings.json to be
 * considered valid, regardless of which worker runtime is selected. The worker-runtime value itself (and the
 * in-process .NET 8 flag when applicable) is validated separately in isDesignTimeSettingsFileValid so the
 * check can adapt to the Node-worker fallback.
 */
const baseRequiredDesignTimeSettingKeys = [appKindSetting, workerRuntimeKey, ProjectDirectoryPathKey];

/**
 * Prefix applied to the design-time copies of host.json / local.settings.json so the consolidated
 * per-project log distinguishes them from the project-root artifacts. The base names come from the
 * same {@link hostFileName} / {@link localSettingsFileName} constants used at the write sites, so the
 * logged names can never drift from what is actually written.
 */
const designTimeArtifactPrefix = 'design-time ';

/**
 * Ensures the logic app project files: the project-level host.json and local.settings.json (built from
 * the logic app, connections.json, and parameters.json) and the workflow-designtime directory baseline.
 *
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<void>} A promise that resolves when all project files have been ensured.
 */
export async function ensureProjectFiles(context: IActionContext, projectPath: string): Promise<void> {
  const projectName = path.basename(projectPath);
  try {
    const hostResult = await ensureHostFile(projectPath);
    const localSettings = await ensureLocalSettingsFile(context, projectPath);
    const designTimeData = await ensureDesignTimeFiles(context, projectPath);

    const changed = [...hostResult.changedArtifacts, ...localSettings.changedArtifacts, ...designTimeData.changedArtifacts];

    if (changed.length === 0) {
      ext.outputChannel.appendLog(
        localize(
          'projectArtifactsValid',
          'Project "{0}": host.json, local.settings.json, and design-time configuration are valid — no regeneration needed.',
          projectName
        )
      );
    } else {
      ext.outputChannel.appendLog(
        localize('projectArtifactsRegenerated', 'Project "{0}": regenerated {1}.', projectName, changed.join(', '))
      );
    }
  } catch (error) {
    ext.outputChannel.appendLog(
      localize(
        'projectArtifactsFailed',
        'Project "{0}": failed to validate/regenerate artifacts — {1}.',
        projectName,
        error instanceof Error ? error.message : String(error)
      )
    );
    throw error;
  }
}

/**
 * Ensures the project-level host.json exists and is valid.
 *
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<{ changed: boolean; changedArtifacts: string[] }>} Whether the file was written
 * (created or repaired), and the human-readable label for the artifact when it changed.
 */
export async function ensureHostFile(projectPath: string): Promise<{ changed: boolean; changedArtifacts: string[] }> {
  const hostFilePath = path.join(projectPath, hostFileName);

  if (await isHostFileValid(hostFilePath, false)) {
    return { changed: false, changedArtifacts: [] };
  }

  await writeFormattedJson(hostFilePath, generateHostJson());
  return { changed: true, changedArtifacts: [hostFileName] };
}

/**
 * Ensures the project-level local.settings.json exists and contains all required app settings.
 *
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<{ changed: boolean; addedSettings: string[]; changedArtifacts: string[] }>} Whether
 * the file was created or updated, which setting keys were added, and the human-readable label(s) for
 * the artifact(s) that changed (empty when nothing changed).
 */
export async function ensureLocalSettingsFile(
  context: IActionContext,
  projectPath: string
): Promise<{ changed: boolean; addedSettings: string[]; changedArtifacts: string[] }> {
  const localSettingsPath = path.join(projectPath, localSettingsFileName);
  const fileExisted = await fse.pathExists(localSettingsPath);

  const logicAppType = await detectProjectType(projectPath);
  const baselineValues = generateLocalSettingsJson(projectPath, logicAppType).Values ?? {};
  const referencedSettings = await getReferencedAppSettings(projectPath);

  const currentSettings: ILocalSettingsJson = await getLocalSettingsJson(context, projectPath);
  const currentValues = currentSettings.Values ?? {};

  const settingsToAdd: Record<string, string> = {};

  for (const [key, value] of Object.entries(baselineValues)) {
    if (currentValues[key] === undefined) {
      settingsToAdd[key] = value;
    }
  }

  for (const key of referencedSettings) {
    if (currentValues[key] === undefined && settingsToAdd[key] === undefined) {
      settingsToAdd[key] = '';
    }
  }

  if (isManagedIdentityAuthEnabled() && currentValues[workflowAuthenticationMethodKey] !== workflowAuthenticationMethodMIValue) {
    settingsToAdd[workflowAuthenticationMethodKey] = workflowAuthenticationMethodMIValue;
  }

  if (currentValues[ProjectDirectoryPathKey] !== undefined && !arePathsEqual(currentValues[ProjectDirectoryPathKey], projectPath)) {
    settingsToAdd[ProjectDirectoryPathKey] = projectPath;
  }

  if (!fileExisted || Object.keys(settingsToAdd).length > 0) {
    await addOrUpdateLocalAppSettings(context, projectPath, settingsToAdd);
    const addedSettings = Object.keys(settingsToAdd);
    const addedSuffix = addedSettings.length > 0 ? ` (added ${addedSettings.length} setting(s): ${addedSettings.join(', ')})` : '';
    return { changed: true, addedSettings, changedArtifacts: [`${localSettingsFileName}${addedSuffix}`] };
  }

  return { changed: false, addedSettings: [], changedArtifacts: [] };
}

/**
 * Collects all app settings referenced by the logic app project. Scans connections.json,
 * parameters.json, and every workflow.json in the project for `@appsetting('name')` references.
 *
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<string[]>} Unique app setting names referenced anywhere in the project.
 */
export async function getReferencedAppSettings(projectPath: string): Promise<string[]> {
  const keys = new Set<string>();

  const addReferences = (content: string): void => {
    for (const key of extractAppSettingReferences(content)) {
      keys.add(key);
    }
  };

  addReferences(await readFileTextSafe(path.join(projectPath, connectionsFileName)));
  addReferences(await readFileTextSafe(path.join(projectPath, parametersFileName)));

  try {
    const subPaths: string[] = await fse.readdir(projectPath);
    for (const subPath of subPaths) {
      const workflowFilePath = path.join(projectPath, subPath, workflowFileName);
      if (await fse.pathExists(workflowFilePath)) {
        addReferences(await readFileTextSafe(workflowFilePath));
      }
    }
  } catch {
    // If the project cannot be enumerated, fall back to connections/parameters references only.
  }

  return Array.from(keys);
}

/**
 * Extracts the unique set of app setting names referenced through `@appsetting('name')` /
 * `@{appsetting('name')}` expressions in the provided content.
 *
 * @param {string} content - Raw file content to scan.
 * @returns {string[]} Unique app setting names referenced in the content.
 */
export function extractAppSettingReferences(content: string): string[] {
  if (!content) {
    return [];
  }

  const keys = new Set<string>();
  appSettingReferenceRegex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = appSettingReferenceRegex.exec(content)) !== null) {
    if (match[1]) {
      keys.add(match[1]);
    }
  }

  return Array.from(keys);
}

/**
 * Ensures the workflow-designtime local.settings.json and host.json files.
 *
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<{ changedArtifacts: string[] }>} The human-readable label(s) for the artifact(s) that changed.
 */
export async function ensureDesignTimeFiles(
  context: IActionContext,
  projectPath: string
): Promise<{ changedArtifacts: string[] }> {
  const designTimeDirectory = Uri.file(path.join(projectPath, designTimeDirectoryName));
  if (!(await fse.pathExists(designTimeDirectory.fsPath))) {
    await workspace.fs.createDirectory(designTimeDirectory);
  }

  const validation = await validateDesignTimeDirectory(projectPath);
  const shouldRegenerateHostJson = !validation.hostFileValid;
  const shouldRegenerateLocalSettingsJson = !validation.settingsFileValid;
  const changedArtifacts: string[] = [];

  if (shouldRegenerateHostJson) {
    await writeFormattedJson(path.join(designTimeDirectory.fsPath, hostFileName), generateDesignTimeHostJson());
    changedArtifacts.push(`${designTimeArtifactPrefix}${hostFileName}`);
  }

  if (shouldRegenerateLocalSettingsJson) {
    const logicAppType = await detectProjectType(projectPath);
    const useNodeWorker = useNodeDesignTimeWorker(projectPath);
    const settingsFileContent = generateDesignTimeLocalSettingsJson(projectPath, logicAppType, useNodeWorker);
    await writeFormattedJson(path.join(designTimeDirectory.fsPath, localSettingsFileName), settingsFileContent);
    changedArtifacts.push(`${designTimeArtifactPrefix}${localSettingsFileName}`);
  }

  return { changedArtifacts };
}

/**
 * Describes the validation state of a design-time directory.
 */
export interface DesignTimeDirectoryValidation {
  directoryExists: boolean;
  hostFileValid: boolean;
  settingsFileValid: boolean;
  isValid: boolean;
}

/**
 * Validates the workflow-designtime contents (host.json and local.settings.json with the required settings).
 *
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<DesignTimeDirectoryValidation>} The validation result.
 */
export async function validateDesignTimeDirectory(projectPath: string): Promise<DesignTimeDirectoryValidation> {
  const designTimeDirectoryPath = path.join(projectPath, designTimeDirectoryName);
  const directoryExists = await fse.pathExists(designTimeDirectoryPath);

  if (!directoryExists) {
    return { directoryExists: false, hostFileValid: false, settingsFileValid: false, isValid: false };
  }

  const hostFileValid = await isHostFileValid(path.join(designTimeDirectoryPath, hostFileName), true);

  const localSettingsPath = path.join(designTimeDirectoryPath, localSettingsFileName);
  const projectType = await detectProjectType(projectPath);
  const settingsFileValid = await isDesignTimeSettingsFileValid(
    localSettingsPath,
    projectPath,
    projectType,
    useNodeDesignTimeWorker(projectPath)
  );

  return {
    directoryExists: true,
    hostFileValid,
    settingsFileValid,
    isValid: hostFileValid && settingsFileValid,
  };
}

/**
 * Validates the host.json file content. Used for both the project-level host.json and the design-time
 * host.json: both require a version and the workflows extension bundle (id + version). The design-time
 * host.json additionally must enable workflow operation discovery host mode so the design-time API can
 * enumerate operations.
 *
 * @param {string} hostFilePath - Absolute path to the host.json file.
 * @param {boolean} isDesignTime - Whether the file is the design-time host.json (stricter validation).
 * @returns {Promise<boolean>} True when host.json exists and is valid.
 */
async function isHostFileValid(hostFilePath: string, isDesignTime: boolean): Promise<boolean> {
  const content = await readFileTextSafe(hostFilePath);
  if (!content) {
    return false;
  }

  try {
    const parsed = parseJson(content) as {
      version?: string;
      extensionBundle?: { id?: string; version?: string };
      extensions?: { workflow?: { settings?: Record<string, string> } };
    };

    const hasValidBundle = !!parsed?.version && parsed?.extensionBundle?.id === extensionBundleId && !!parsed?.extensionBundle?.version;
    if (!hasValidBundle) {
      return false;
    }

    if (isDesignTime) {
      return !!parsed?.extensions?.workflow?.settings?.[workflowOperationDiscoveryHostModeKey];
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates the local.settings.json file content in the design-time directory.
 *
 * @param {string} settingsFilePath - Absolute path to the design-time local.settings.json file.
 * @param {string} projectPath - The expected project directory path value.
 * @param {ProjectType} projectType - The logic app project type.
 * @param {boolean} useNodeWorker - Whether the design-time host is expected to run with the Node worker.
 * @returns {Promise<boolean>} True when the file is present and contains the required keys with correct values.
 */
async function isDesignTimeSettingsFileValid(
  settingsFilePath: string,
  projectPath: string,
  projectType: ProjectType,
  useNodeWorker: boolean
): Promise<boolean> {
  const content = await readFileTextSafe(settingsFilePath);
  if (!content) {
    return false;
  }

  try {
    const parsed = parseJson(content) as ILocalSettingsJson;
    const values = parsed?.Values ?? {};
    const allRequiredKeysPresent = baseRequiredDesignTimeSettingKeys.every((key) => values[key] !== undefined && values[key] !== '');
    if (!allRequiredKeysPresent) {
      return false;
    }

    if (!arePathsEqual(values[ProjectDirectoryPathKey], projectPath)) {
      return false;
    }

    if (isManagedIdentityAuthEnabled() && values[workflowAuthenticationMethodKey] !== workflowAuthenticationMethodMIValue) {
      return false;
    }

    // Presence alone is not enough: the file must also point at the expected worker runtime. When the
    // Node-worker fallback is enabled, a Node file is valid. Otherwise the design-time host must run
    // in-process .NET 8 so the Functions runtime spawns the NetFxWorker that the Data Mapper Test map
    // relies on, so require dotnet + FUNCTIONS_INPROC_NET8_ENABLED. A file left on the wrong runtime is
    // treated as invalid and regenerated.
    const workerRuntime = (values[workerRuntimeKey] ?? '').toLowerCase();
    if (useNodeWorker || projectType === ProjectType.codeful) {
      return workerRuntime === WorkerRuntime.Node;
    }
    const inprocNet8Enabled = values[functionsInprocNet8Enabled] === functionsInprocNet8EnabledTrue;
    return workerRuntime === WorkerRuntime.Dotnet && inprocNet8Enabled;
  } catch {
    return false;
  }
}

/**
 * Reads the text content of a file, returning an empty string when the file does not exist or cannot be read.
 *
 * @param {string} filePath - Absolute path to the file.
 * @returns {Promise<string>} The file content, or an empty string.
 */
async function readFileTextSafe(filePath: string): Promise<string> {
  try {
    if (await fse.pathExists(filePath)) {
      return (await fse.readFile(filePath)).toString();
    }
  } catch {
    // Ignore read errors and treat the file as empty.
  }
  return '';
}

function arePathsEqual(path1: unknown, path2: unknown): boolean {
  if (typeof path1 !== 'string' || typeof path2 !== 'string' || !path1 || !path2) {
    return false;
  }
  const resolved1 = path.resolve(path1);
  const resolved2 = path.resolve(path2);
  return process.platform === 'win32' ? resolved1.toLowerCase() === resolved2.toLowerCase() : resolved1 === resolved2;
}
