/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  enableProjectConsistencyChecksSetting,
  extensionsFileName,
  funcDependencyName,
  funcVersionSetting,
  launchFileName,
  projectLanguageSetting,
  settingsFileName,
  tasksFileName,
  vscodeFolderName,
} from '../../constants';
import { localize } from '../../localize';
import { initProjectForVSCode } from '../commands/initProjectForVSCode/initProjectForVSCode';
import { binariesExistSync } from '../utils/binaries';
import { detectCustomCodeTargetFramework } from '../utils/customCodeUtils';
import { tryGetTargetFramework } from '../utils/dotnet/dotnet';
import { writeFormattedJson } from '../utils/fs';
import { detectProjectPackageType, detectProjectType } from '../utils/project';
import {
  generateExtensionsJson,
  generateLaunchJson,
  generateSettingsJson,
  generateTasksJson,
  type VSCodeConfigJson,
  type VSCodeProjectConfig,
} from './fileGenerators';
import { getWorkspaceSetting, updateGlobalSetting, isProjectConsistencyCheckEnabled } from '../utils/vsCodeConfig/settings';
import { callWithTelemetryAndErrorHandling, DialogResponses, type IActionContext } from '@microsoft/vscode-azext-utils';
import { ProjectPackageType, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { MessageItem } from 'vscode';
import { getWorkspaceLogicAppRoots } from '../utils/workspace';

/**
 * Ensures that the VS Code configuration files for all Logic App projects in the workspace are present and up-to-date.
 * @param {IActionContext} context - The action context.
 * @param {string[]} [projectPaths] - The paths to the Logic App projects in the workspace. If not provided, will search for logic app projects.
 * @returns {Promise<void>} A promise that resolves when the check is complete.
 */
export async function ensureVSCodeFiles(context: IActionContext, projectPaths?: string[]): Promise<void> {
  projectPaths ??= await getWorkspaceLogicAppRoots();

  if (!projectPaths || projectPaths.length === 0 || !isProjectConsistencyCheckEnabled()) {
    return;
  }

  for (const projectPath of projectPaths) {
    const shouldContinue = await ensureProjectVSCodeFiles(context, projectPath);
    if (!shouldContinue) {
      break;
    }
  }
}

/**
 * Ensures that the VS Code configuration files for a specific Logic App project are present and up-to-date.
 * If the project is not initialized for VS Code, it will prompt the user to initialize it.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path to the Logic App project.
 * @returns {Promise<boolean>} A promise that resolves to `true` if should continue prompting, `false` otherwise (user disabled warning).
 */
export async function ensureProjectVSCodeFiles(context: IActionContext, projectPath: string): Promise<boolean> {
  if (isProjectInitializedForVSCode(projectPath)) {
    const expectedConfig = await getExpectedVSCodeConfigJson(projectPath);
    const isValidConfig = await isValidVSCodeConfig(projectPath, expectedConfig);
    if (isValidConfig) {
      return true;
    }

    return await promptToRegenerateVSCodeFiles(context, projectPath, expectedConfig);
  }

  return await promptToInitializeProject(context, projectPath);
}

/**
 * Checks if a Logic App project is initialized for VS Code by verifying the presence of required configuration files and settings.
 * @param {string} projectPath - The path to the Logic App project.
 * @returns {boolean} `true` if the project is initialized for VS Code, `false` otherwise (user disabled warning).
 */
export function isProjectInitializedForVSCode(projectPath: string): boolean {
  const hasAllVSCodeFiles = getVSCodeFilePaths(projectPath).every((filePath) => fse.existsSync(filePath));
  const language = getWorkspaceSetting(projectLanguageSetting, projectPath);
  const funcVersion = getWorkspaceSetting(funcVersionSetting, projectPath);

  return hasAllVSCodeFiles && !!language && !!funcVersion;
}

/**
 * Prompts the user to initialize a Logic App project for VS Code if it is not already initialized.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The project path to initialize.
 * @returns {Promise<boolean>} A promise that resolves to `true` if should continue prompting, `false` otherwise (user disabled warning).
 */
async function promptToInitializeProject(context: IActionContext, projectPath: string): Promise<boolean> {
  const message = localize(
    'missingVSCodeArtifactsWarning',
    'Detected an Azure Logic App project "{0}" that may have been created outside of VS Code or is missing configuration files. Initialize for optimal use with VS Code?',
    projectPath
  );
  const result: MessageItem | undefined = await context.ui.showWarningMessage(
    message,
    {},
    DialogResponses.yes,
    DialogResponses.dontWarnAgain
  );

  if (result === DialogResponses.yes) {
    await callWithTelemetryAndErrorHandling('ensureVSCodeFiles.initProjectForVSCode', async (actionContext: IActionContext) => {
      actionContext.errorHandling.rethrow = true;
      actionContext.errorHandling.suppressDisplay = true;
      await initProjectForVSCode(actionContext, projectPath);
    });
  } else if (result === DialogResponses.dontWarnAgain) {
    await updateGlobalSetting(enableProjectConsistencyChecksSetting, false);
    return false;
  }

  return true;
}

/**
 * Checks if the VS Code configuration files for a Logic App project are valid and up-to-date.
 * @param {string} projectPath - The path to the Logic App project.
 * @param {VSCodeConfigJson} [expectedConfig] - Optional expected configuration to compare against.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the configuration is valid and up-to-date, `false` otherwise.
 */
async function isValidVSCodeConfig(projectPath: string, expectedConfig?: VSCodeConfigJson): Promise<boolean> {
  const [tasksJsonPath, launchJsonPath, settingsJsonPath, extensionsJsonPath] = getVSCodeFilePaths(projectPath);
  if (![tasksJsonPath, launchJsonPath, settingsJsonPath, extensionsJsonPath].every((filePath) => fse.existsSync(filePath))) {
    return false;
  }

  expectedConfig = expectedConfig || (await getExpectedVSCodeConfigJson(projectPath));

  try {
    const actualTasksJson = await fse.readJson(tasksJsonPath);
    const actualLaunchJson = await fse.readJson(launchJsonPath);
    const actualSettingsJson = await fse.readJson(settingsJsonPath);
    const actualExtensionsJson = await fse.readJson(extensionsJsonPath);

    return (
      isDeepEqual(expectedConfig.tasksJson, actualTasksJson) &&
      isDeepEqual(expectedConfig.launchJson, actualLaunchJson) &&
      isExpectedSubset(expectedConfig.settingsJson, actualSettingsJson) &&
      containsExpectedExtensions(expectedConfig.extensionsJson, actualExtensionsJson)
    );
  } catch {
    return false;
  }
}

/**
 * Prompts the user to regenerate VS Code configuration files for a Logic App project if they are outdated.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path to the Logic App project.
 * @param {VSCodeConfigJson} [config] - Optional configuration to use for regeneration.
 * @returns {Promise<boolean>} A promise that resolves to `true` if should continue prompting, `false` otherwise.
 */
async function promptToRegenerateVSCodeFiles(context: IActionContext, projectPath: string, config?: VSCodeConfigJson): Promise<boolean> {
  const message = localize(
    'outdatedVSCodeArtifactsInfo',
    'Detected out of date .vscode configuration files for Logic App project "{0}". Regenerate to match current project settings?',
    projectPath
  );
  const result: MessageItem | undefined = await context.ui.showWarningMessage(
    message,
    {},
    DialogResponses.yes,
    DialogResponses.dontWarnAgain
  );

  if (result === DialogResponses.yes) {
    config = config || (await getExpectedVSCodeConfigJson(projectPath));
    const vscodeFolderPath = path.join(projectPath, vscodeFolderName);
    await fse.ensureDir(vscodeFolderPath);

    const [tasksJsonPath, launchJsonPath, settingsJsonPath, extensionsJsonPath] = getVSCodeFilePaths(projectPath);
    await writeFormattedJson(tasksJsonPath, config.tasksJson);
    await writeFormattedJson(launchJsonPath, config.launchJson);
    await writeFormattedJson(settingsJsonPath, config.settingsJson);
    await writeFormattedJson(extensionsJsonPath, config.extensionsJson);
  } else if (result === DialogResponses.dontWarnAgain) {
    await updateGlobalSetting(enableProjectConsistencyChecksSetting, false);
    return false;
  }

  return true;
}

async function getExpectedVSCodeConfigJson(projectPath: string): Promise<VSCodeConfigJson> {
  const projectConfig = await getProjectConfig(projectPath);

  return {
    tasksJson: generateTasksJson(projectConfig),
    launchJson: generateLaunchJson(projectConfig),
    settingsJson: generateSettingsJson(projectConfig),
    extensionsJson: generateExtensionsJson(),
  };
}

// TODO(aeldridge): Should de-duplicate getProjectConfig logic with InitProjectStep
async function getProjectConfig(projectPath: string): Promise<VSCodeProjectConfig> {
  const projectType = await detectProjectType(projectPath);
  const projectPackageType = await detectProjectPackageType(projectPath);
  const targetFramework =
    projectType === ProjectType.codeful || projectPackageType === ProjectPackageType.Nuget
      ? await tryGetTargetFramework(projectPath)
      : undefined;

  return {
    projectType,
    projectPackageType,
    hasFuncBinaries: binariesExistSync(funcDependencyName),
    targetFramework,
    logicAppName: path.basename(projectPath),
    funcVersion: getWorkspaceSetting(funcVersionSetting, projectPath),
    language: getWorkspaceSetting(projectLanguageSetting, projectPath),
    customCodeTargetFramework: await detectCustomCodeTargetFramework(projectPath),
  };
}

function containsExpectedExtensions(expected: { recommendations: string[] }, actual: unknown): boolean {
  if (!isJsonObject(actual)) {
    return false;
  }

  const actualRecommendations = actual.recommendations;
  return (
    Array.isArray(actualRecommendations) &&
    expected.recommendations.every((recommendation) => actualRecommendations.includes(recommendation))
  );
}

function getVSCodeFilePaths(projectPath: string): string[] {
  return [tasksFileName, launchFileName, settingsFileName, extensionsFileName].map((fileName) =>
    path.join(projectPath, vscodeFolderName, fileName)
  );
}

function isExpectedSubset(expected: unknown, actual: unknown): boolean {
  if (Array.isArray(expected)) {
    return isDeepEqual(expected, actual);
  }

  if (isJsonObject(expected)) {
    if (!isJsonObject(actual)) {
      return false;
    }

    return Object.keys(expected).every((key) => isExpectedSubset(expected[key], actual[key]));
  }

  return isDeepEqual(expected, actual);
}

function isDeepEqual(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => isDeepEqual(value, right[index]));
  }

  if (isJsonObject(left) || isJsonObject(right)) {
    if (!isJsonObject(left) || !isJsonObject(right)) {
      return false;
    }

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every((key) => rightKeys.includes(key) && isDeepEqual(left[key], right[key]));
  }

  return left === right;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
