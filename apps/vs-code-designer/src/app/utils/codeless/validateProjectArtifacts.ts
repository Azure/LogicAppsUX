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
  hostFileContent,
  hostFileName,
  localSettingsFileName,
  logicAppKind,
  parametersFileName,
  workerRuntimeKey,
  workflowFileName,
} from '../../../constants';
import { localize } from '../../../localize';
import { ext } from '../../../extensionVariables';
import { addOrUpdateLocalAppSettings, getLocalSettingsJson, getLocalSettingsSchema } from '../appSettings/localSettings';
import { writeFormattedJson } from '../fs';
import { parseJson } from '../parseJson';
import { isCodefulProject } from '../codeful';
import { WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Uri, workspace } from 'vscode';

/**
 * Matches app setting references such as `@appsetting('MY_SETTING')` and the interpolated
 * variant `@{appsetting('MY_SETTING')}`. Both single and double quotes are supported.
 */
const appSettingReferenceRegex = /appsetting\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * App setting keys that are required for the design-time local.settings.json to be considered valid.
 */
const requiredDesignTimeSettingKeys = [appKindSetting, workerRuntimeKey, ProjectDirectoryPathKey];

/**
 * Reads the text content of a file, returning an empty string when the file does not exist or cannot be read.
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

/**
 * Extracts the unique set of app setting names referenced through `@appsetting('name')` /
 * `@{appsetting('name')}` expressions in the provided content.
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
 * Collects all app settings referenced by the logic app project. This scans connections.json,
 * parameters.json, and every workflow.json in the project for `@appsetting('name')` references.
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
 * Ensures the project-level local.settings.json exists and contains every app setting the project
 * requires. This is needed when source control is enabled: local.settings.json is git-ignored, so a
 * fresh clone is missing it and any `@appsetting('name')` references in connections.json /
 * parameters.json / workflows resolve to undefined, making the project invalid.
 *
 * Baseline runtime settings are added when missing and every referenced app setting is added with an
 * empty placeholder value when missing. Existing values are never overwritten.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<boolean>} True when the file was created or updated, otherwise false.
 */
export async function regenerateLocalSettings(context: IActionContext, projectPath: string): Promise<boolean> {
  const localSettingsPath = path.join(projectPath, localSettingsFileName);
  const fileExisted = await fse.pathExists(localSettingsPath);

  const isCodeful = (await isCodefulProject(projectPath)) ?? false;
  const baselineValues = getLocalSettingsSchema(false, projectPath, isCodeful).Values ?? {};
  const referencedSettings = await getReferencedAppSettings(projectPath);

  const currentSettings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath);
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

  if (!fileExisted || Object.keys(settingsToAdd).length > 0) {
    await addOrUpdateLocalAppSettings(context, projectPath, settingsToAdd);
    ext.outputChannel.appendLog(
      localize(
        'regeneratedLocalSettings',
        'Ensured local settings for project "{0}". Added {1} setting(s).',
        projectPath,
        Object.keys(settingsToAdd).length
      )
    );
    return true;
  }

  return false;
}

/**
 * Validates the host.json file content in the design-time directory.
 * @param {string} hostFilePath - Absolute path to the host.json file.
 * @returns {Promise<boolean>} True when host.json is present and structurally valid.
 */
async function isDesignTimeHostFileValid(hostFilePath: string): Promise<boolean> {
  const content = await readFileTextSafe(hostFilePath);
  if (!content) {
    return false;
  }

  try {
    const parsed = parseJson(content) as { version?: string; extensionBundle?: { id?: string } };
    return !!parsed?.version && parsed?.extensionBundle?.id === extensionBundleId;
  } catch {
    return false;
  }
}

/**
 * Validates the local.settings.json file content in the design-time directory.
 * @param {string} settingsFilePath - Absolute path to the design-time local.settings.json file.
 * @returns {Promise<boolean>} True when the file is present and contains the required keys.
 */
async function isDesignTimeSettingsFileValid(settingsFilePath: string): Promise<boolean> {
  const content = await readFileTextSafe(settingsFilePath);
  if (!content) {
    return false;
  }

  try {
    const parsed = parseJson(content) as ILocalSettingsJson;
    const values = parsed?.Values ?? {};
    return requiredDesignTimeSettingKeys.every((key) => values[key] !== undefined && values[key] !== '');
  } catch {
    return false;
  }
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
 * Validates that the workflow-designtime directory has the expected contents (host.json and
 * local.settings.json with the required settings).
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<DesignTimeDirectoryValidation>} The validation result.
 */
export async function validateDesignTimeDirectory(projectPath: string): Promise<DesignTimeDirectoryValidation> {
  const designTimeDirectoryPath = path.join(projectPath, designTimeDirectoryName);
  const directoryExists = await fse.pathExists(designTimeDirectoryPath);

  if (!directoryExists) {
    return { directoryExists: false, hostFileValid: false, settingsFileValid: false, isValid: false };
  }

  const hostFileValid = await isDesignTimeHostFileValid(path.join(designTimeDirectoryPath, hostFileName));
  const settingsFileValid = await isDesignTimeSettingsFileValid(path.join(designTimeDirectoryPath, localSettingsFileName));

  return {
    directoryExists: true,
    hostFileValid,
    settingsFileValid,
    isValid: hostFileValid && settingsFileValid,
  };
}

/**
 * Ensures the workflow-designtime directory exists, creating it if necessary.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<Uri>} The design-time directory Uri.
 */
async function ensureDesignTimeDirectory(projectPath: string): Promise<Uri> {
  // When the project path already points inside the design-time directory, use it directly.
  if (projectPath.includes(designTimeDirectoryName)) {
    return Uri.file(projectPath);
  }

  const designTimeDirectoryUri = Uri.file(path.join(projectPath, designTimeDirectoryName + path.sep));
  if (!(await fse.pathExists(designTimeDirectoryUri.fsPath))) {
    await workspace.fs.createDirectory(designTimeDirectoryUri);
  }
  return designTimeDirectoryUri;
}

/**
 * Validates and, when needed, regenerates the workflow-designtime directory baseline contents
 * (host.json and local.settings.json). Valid existing files are preserved so that customizations
 * such as a pinned extension bundle version are not lost.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<Uri>} The design-time directory Uri.
 */
export async function regenerateDesignTimeDirectory(context: IActionContext, projectPath: string): Promise<Uri> {
  const designTimeDirectory = await ensureDesignTimeDirectory(projectPath);
  const validation = await validateDesignTimeDirectory(projectPath);

  if (!validation.hostFileValid) {
    await writeFormattedJson(path.join(designTimeDirectory.fsPath, hostFileName), hostFileContent);
    ext.outputChannel.appendLog(localize('regeneratedDesignTimeHost', 'Regenerated design-time host.json for project "{0}".', projectPath));
  }

  if (!validation.settingsFileValid) {
    const isCodeful = (await isCodefulProject(projectPath)) ?? false;
    const settingsFileContent = getLocalSettingsSchema(true, projectPath, isCodeful);
    await writeFormattedJson(path.join(designTimeDirectory.fsPath, localSettingsFileName), settingsFileContent);
    await addOrUpdateLocalAppSettings(
      context,
      designTimeDirectory.fsPath,
      {
        [appKindSetting]: logicAppKind,
        [ProjectDirectoryPathKey]: projectPath,
        [workerRuntimeKey]: WorkerRuntime.Node,
      },
      true
    );
    ext.outputChannel.appendLog(
      localize('regeneratedDesignTimeSettings', 'Regenerated design-time local.settings.json for project "{0}".', projectPath)
    );
  }

  return designTimeDirectory;
}

/**
 * Validates and regenerates the artifacts required for a logic app project to be valid when source
 * control strips git-ignored files: the project-level local.settings.json (built from the logic app,
 * connections.json, and parameters.json) and the workflow-designtime directory baseline.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<Uri>} The design-time directory Uri, ready to be used as the host working directory.
 */
export async function validateAndRegenerateProjectArtifacts(context: IActionContext, projectPath: string): Promise<Uri> {
  await regenerateLocalSettings(context, projectPath);
  return regenerateDesignTimeDirectory(context, projectPath);
}
