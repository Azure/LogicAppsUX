/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  ProjectDirectoryPathKey,
  appKindSetting,
  connectionsFileName,
  defaultVersionRange,
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
import {
  addOrUpdateLocalAppSettings,
  getLocalSettingsJson,
  getLocalSettingsSchema,
  getRootLocalSettings,
} from '../appSettings/localSettings';
import { writeFormattedJson } from '../fs';
import { parseJson } from '../parseJson';
import { isCodefulProject } from '../codeful';
import { ProjectType, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import type { IHostJsonV2, ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
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
  ext.outputChannel.appendLog(
    localize(
      'checkingLocalSettings',
      'Checking local.settings.json for project "{0}" at "{1}" (exists: {2}).',
      projectPath,
      localSettingsPath,
      String(fileExisted)
    )
  );

  const isCodeful = (await isCodefulProject(projectPath)) ?? false;
  // Build the baseline from the same source of truth as fresh project creation so a regenerated
  // local.settings.json matches what a newly created project of this type would produce.
  const logicAppType = isCodeful ? ProjectType.codeful : ProjectType.logicApp;
  const baselineValues = getRootLocalSettings(projectPath, logicAppType).Values ?? {};
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
        'Ensured local.settings.json for project "{0}" (file existed: {1}). Added {2} setting(s): {3}.',
        projectPath,
        String(fileExisted),
        Object.keys(settingsToAdd).length,
        Object.keys(settingsToAdd).join(', ') || '(none)'
      )
    );
    return true;
  }

  ext.outputChannel.appendLog(
    localize(
      'localSettingsUpToDate',
      'local.settings.json for project "{0}" already exists and contains all required settings. Skipping regeneration.',
      projectPath
    )
  );
  return false;
}

/**
 * Returns the baseline project-level host.json content. This mirrors the workspace creation path
 * (CreateLogicAppWorkspace.getHostContent) so a regenerated host.json matches a freshly created one.
 * @returns {IHostJsonV2} The baseline host.json content.
 */
function getRootHostFileContent(): IHostJsonV2 {
  return {
    version: '2.0',
    logging: {
      applicationInsights: {
        samplingSettings: {
          isEnabled: true,
          excludedTypes: 'Request',
        },
      },
    },
    extensionBundle: {
      id: extensionBundleId,
      version: defaultVersionRange,
    },
  };
}

/**
 * Ensures the project-level host.json exists and is structurally valid. When source control is
 * enabled this file can be missing from a fresh clone; without it the function host cannot start.
 * A valid existing host.json (correct version + workflows extension bundle) is preserved so that
 * customizations such as a pinned extension bundle version are not lost.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<boolean>} True when the file was created, otherwise false.
 */
export async function regenerateRootHostFile(projectPath: string): Promise<boolean> {
  const hostFilePath = path.join(projectPath, hostFileName);
  const hostFileExisted = await fse.pathExists(hostFilePath);
  ext.outputChannel.appendLog(
    localize(
      'checkingRootHost',
      'Checking host.json for project "{0}" at "{1}" (exists: {2}).',
      projectPath,
      hostFilePath,
      String(hostFileExisted)
    )
  );

  if (await isHostFileValid(hostFilePath)) {
    ext.outputChannel.appendLog(
      localize('rootHostValid', 'host.json for project "{0}" is present and valid. Skipping regeneration.', projectPath)
    );
    return false;
  }

  await writeFormattedJson(hostFilePath, getRootHostFileContent());
  ext.outputChannel.appendLog(
    localize('regeneratedRootHost', 'Regenerated missing or invalid host.json for project "{0}" at "{1}".', projectPath, hostFilePath)
  );
  return true;
}

/**
 * Validates the host.json file content. Used for both the project-level host.json and the
 * design-time host.json, since both require a version and the workflows extension bundle.
 * @param {string} hostFilePath - Absolute path to the host.json file.
 * @returns {Promise<boolean>} True when host.json is present and structurally valid.
 */
async function isHostFileValid(hostFilePath: string): Promise<boolean> {
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

  const hostFileValid = await isHostFileValid(path.join(designTimeDirectoryPath, hostFileName));
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
 * control strips git-ignored files: the project-level host.json and local.settings.json (built from
 * the logic app, connections.json, and parameters.json) and the workflow-designtime directory baseline.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<Uri>} The design-time directory Uri, ready to be used as the host working directory.
 */
export async function validateAndRegenerateProjectArtifacts(context: IActionContext, projectPath: string): Promise<Uri> {
  ext.outputChannel.appendLog(
    localize('validatingProjectArtifacts', 'Validating and regenerating project artifacts for logic app "{0}".', projectPath)
  );
  await regenerateRootHostFile(projectPath);
  await regenerateLocalSettings(context, projectPath);
  return regenerateDesignTimeDirectory(context, projectPath);
}
