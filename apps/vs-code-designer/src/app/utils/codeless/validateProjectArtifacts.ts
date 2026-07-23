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
  logicAppKind,
  parametersFileName,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  workerRuntimeKey,
  workflowFileName,
  workflowOperationDiscoveryHostModeKey,
  workflowAuthenticationMethodKey,
  workflowAuthenticationMethodMIValue,
} from '../../../constants';
import { localize } from '../../../localize';
import { ext } from '../../../extensionVariables';
import { isManagedIdentityAuthEnabled, useNodeDesignTimeWorker } from '../vsCodeConfig/settings';
import { generateHostJson, generateDesignTimeHostJson } from '../vsCodeConfig/generators';
import { addOrUpdateLocalAppSettings, getLocalSettingsJson, getLocalSettingsSchema } from '../appSettings/localSettings';
import { writeFormattedJson } from '../fs';
import { parseJson } from '../parseJson';
import { WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Uri, workspace } from 'vscode';
import { detectProjectType } from '../project';

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
 * @returns {Promise<{ changed: boolean; addedSettings: string[]; changedArtifacts: string[] }>} Whether
 * the file was created or updated, which setting keys were added, and the human-readable label(s) for
 * the artifact(s) that changed (empty when nothing changed).
 */
export async function regenerateLocalSettings(
  context: IActionContext,
  projectPath: string
): Promise<{ changed: boolean; addedSettings: string[]; changedArtifacts: string[] }> {
  const localSettingsPath = path.join(projectPath, localSettingsFileName);
  const fileExisted = await fse.pathExists(localSettingsPath);

  // Build the baseline from the same source of truth as fresh project creation so a regenerated
  // local.settings.json matches what a newly created project of this type would produce. The project
  // type is inferred from the project files because a source-controlled clone has no explicit marker.
  const logicAppType = await detectProjectType(projectPath);
  const baselineValues = getLocalSettingsSchema(false, projectPath, logicAppType).Values ?? {};
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

  if (isManagedIdentityAuthEnabled() && currentValues[workflowAuthenticationMethodKey] !== workflowAuthenticationMethodMIValue) {
    settingsToAdd[workflowAuthenticationMethodKey] = workflowAuthenticationMethodMIValue;
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
 * Ensures the project-level host.json exists and is structurally valid, healing it when needed.
 * Because {@link isLogicAppProject} identifies a project by its workflow-folder signal (not host.json),
 * a source-controlled clone can reach this point with host.json missing or corrupted; without a valid
 * host.json the function host cannot start. This regenerates the file in either case. A valid existing
 * host.json (correct version + workflows extension bundle) is preserved so that customizations such as a
 * pinned extension bundle version are not lost.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<{ changed: boolean; changedArtifacts: string[] }>} Whether the file was written
 * (created or repaired), and the human-readable label for the artifact when it changed.
 */
export async function regenerateRootHostFile(projectPath: string): Promise<{ changed: boolean; changedArtifacts: string[] }> {
  const hostFilePath = path.join(projectPath, hostFileName);

  if (await isHostFileValid(hostFilePath, false)) {
    return { changed: false, changedArtifacts: [] };
  }

  await writeFormattedJson(hostFilePath, generateHostJson());
  return { changed: true, changedArtifacts: [hostFileName] };
}

/**
 * Validates the host.json file content. Used for both the project-level host.json and the design-time
 * host.json: both require a version and the workflows extension bundle (id + version). The design-time
 * host.json additionally must enable workflow operation discovery host mode so the design-time API can
 * enumerate operations.
 * @param {string} hostFilePath - Absolute path to the host.json file.
 * @param {boolean} isDesignTime - Whether the file is the design-time host.json (stricter validation).
 * @returns {Promise<boolean>} True when host.json is present and structurally valid.
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
 * @param {string} settingsFilePath - Absolute path to the design-time local.settings.json file.
 * @returns {Promise<boolean>} True when the file is present and contains the required keys.
 */
async function isDesignTimeSettingsFileValid(settingsFilePath: string, useNodeWorker: boolean): Promise<boolean> {
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

    // Presence alone is not enough: the file must also point at the expected worker runtime. When the
    // Node-worker fallback is enabled, a Node file is valid. Otherwise the design-time host must run
    // in-process .NET 8 so the Functions runtime spawns the NetFxWorker that the Data Mapper Test map
    // relies on, so require dotnet + FUNCTIONS_INPROC_NET8_ENABLED. A file left on the wrong runtime is
    // treated as invalid and regenerated.
    const workerRuntime = (values[workerRuntimeKey] ?? '').toLowerCase();
    if (useNodeWorker) {
      return workerRuntime === WorkerRuntime.Node;
    }
    const inprocNet8Enabled = values[functionsInprocNet8Enabled] === functionsInprocNet8EnabledTrue;
    return workerRuntime === WorkerRuntime.Dotnet && inprocNet8Enabled;
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

  const hostFileValid = await isHostFileValid(path.join(designTimeDirectoryPath, hostFileName), true);
  const settingsFileValid = await isDesignTimeSettingsFileValid(
    path.join(designTimeDirectoryPath, localSettingsFileName),
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
 * Ensures the workflow-designtime directory exists, creating it if necessary.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<Uri>} The design-time directory Uri.
 */
async function ensureDesignTimeDirectory(projectPath: string): Promise<Uri> {
  // When the project path already points at (or inside) the design-time directory, use it directly.
  // Match on a full path segment so siblings like "workflow-designtime-backup" don't false-positive.
  const pathSegments = projectPath.split(/[\\/]/);
  if (pathSegments.includes(designTimeDirectoryName)) {
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
 * @returns {Promise<{ uri: Uri; hostRegenerated: boolean; localSettingsRegenerated: boolean; changedArtifacts: string[] }>}
 * The design-time directory Uri, which baseline files were regenerated, and the human-readable label(s)
 * for the artifact(s) that changed.
 */
export async function regenerateDesignTimeDirectory(
  context: IActionContext,
  projectPath: string
): Promise<{ uri: Uri; hostRegenerated: boolean; localSettingsRegenerated: boolean; changedArtifacts: string[] }> {
  const designTimeDirectory = await ensureDesignTimeDirectory(projectPath);
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
    const settingsFileContent = getLocalSettingsSchema(true, projectPath, logicAppType, useNodeWorker);
    await writeFormattedJson(path.join(designTimeDirectory.fsPath, localSettingsFileName), settingsFileContent);
    const runtimeSettings: Record<string, string> = {
      [appKindSetting]: logicAppKind,
      [ProjectDirectoryPathKey]: projectPath,
      [workerRuntimeKey]: useNodeWorker ? WorkerRuntime.Node : WorkerRuntime.Dotnet,
    };
    if (!useNodeWorker) {
      runtimeSettings[functionsInprocNet8Enabled] = functionsInprocNet8EnabledTrue;
    }
    await addOrUpdateLocalAppSettings(context, designTimeDirectory.fsPath, runtimeSettings, true);
    changedArtifacts.push(`${designTimeArtifactPrefix}${localSettingsFileName}`);
  }

  return { uri: designTimeDirectory, hostRegenerated: shouldRegenerateHostJson, localSettingsRegenerated: shouldRegenerateLocalSettingsJson, changedArtifacts };
}

/**
 * Ensures the project-level host.json and local.settings.json are valid (regenerating the
 * git-ignored files a source-controlled clone may be missing) without touching the design-time
 * directory. Emits a single consolidated status line for the project: valid, regenerated (listing
 * exactly what changed), or failed.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<void>} Resolves when the root artifacts have been ensured.
 */
export async function ensureProjectRootArtifacts(context: IActionContext, projectPath: string): Promise<void> {
  const projectName = path.basename(projectPath);
  try {
    const hostResult = await regenerateRootHostFile(projectPath);
    const localSettings = await regenerateLocalSettings(context, projectPath);

    const changed = [...hostResult.changedArtifacts, ...localSettings.changedArtifacts];

    if (changed.length === 0) {
      ext.outputChannel.appendLog(
        localize(
          'projectRootArtifactsValid',
          'Project "{0}": host.json and local.settings.json are valid — no regeneration needed.',
          projectName
        )
      );
      return;
    }

    ext.outputChannel.appendLog(
      localize('projectRootArtifactsRegenerated', 'Project "{0}": regenerated {1}.', projectName, changed.join(', '))
    );
  } catch (error) {
    ext.outputChannel.appendLog(
      localize(
        'projectRootArtifactsFailed',
        'Project "{0}": failed to validate/regenerate artifacts — {1}.',
        projectName,
        error instanceof Error ? error.message : String(error)
      )
    );
    throw error;
  }
}

/**
 * Validates and regenerates the artifacts required for a logic app project to be valid when source
 * control strips git-ignored files: the project-level host.json and local.settings.json (built from
 * the logic app, connections.json, and parameters.json) and the workflow-designtime directory baseline.
 *
 * Emits exactly one consolidated status line for the project: valid, regenerated (listing exactly
 * what changed), or failed. The low-level regenerate helpers are silent so multi-project startup
 * output stays readable.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The logic app project root.
 * @returns {Promise<Uri>} The design-time directory Uri, ready to be used as the host working directory.
 */
export async function validateAndRegenerateProjectArtifacts(context: IActionContext, projectPath: string): Promise<Uri> {
  const projectName = path.basename(projectPath);
  try {
    const hostResult = await regenerateRootHostFile(projectPath);
    const localSettings = await regenerateLocalSettings(context, projectPath);
    const designTime = await regenerateDesignTimeDirectory(context, projectPath);

    const changed = [...hostResult.changedArtifacts, ...localSettings.changedArtifacts, ...designTime.changedArtifacts];

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

    return designTime.uri;
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
