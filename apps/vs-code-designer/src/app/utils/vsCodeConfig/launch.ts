/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { DebugConfiguration, WorkspaceConfiguration, WorkspaceFolder } from 'vscode';
import { workspace } from 'vscode';
import { localize } from '../../../localize';
import { UserCancelledError, type IActionContext } from '@microsoft/vscode-azext-utils';
import { getContainingWorkspace } from '../workspace';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import * as vscode from 'vscode';

const configurationsKey = 'configurations';
const launchKey = 'launch';
const versionKey = 'version';

/**
 * Launches the debugger for a logic app project.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The project path.
 * @returns {Promise<void>} - A promise that resolves when the debugger has started.
 */
export async function launchProjectDebugger(context: IActionContext, projectPath: string): Promise<void> {
  const workspaceFolder = getContainingWorkspace(projectPath);
  const debugConfig = await getDebugConfig(context, workspaceFolder);
  if (!isNullOrUndefined(debugConfig)) {
    await vscode.debug.startDebugging(workspaceFolder, debugConfig);
  }
}

/**
 * Gets a single debug configuration from the launch.json file.
 * @param {IActionContext} context - The action context.
 * @param {WorkspaceFolder} folder - The workspace folder.
 * @param {boolean} shouldPromptOnMultipleConfigs - A flag indicating whether to prompt user for selection on multiple configs.
 * @returns {Promise<DebugConfiguration | undefined>} - A promise that resolves to the debug configuration or undefined if one couldn't be retrieved.
 */
export async function getDebugConfig(
  context: IActionContext,
  folder: WorkspaceFolder,
  shouldPromptOnMultipleConfigs = true
): Promise<DebugConfiguration | undefined> {
  if (isNullOrUndefined(folder)) {
    return undefined;
  }

  const debugConfigs = getDebugConfigs(folder);
  if (debugConfigs.length === 0) {
    return undefined;
  }

  if (debugConfigs.length === 1 || !shouldPromptOnMultipleConfigs) {
    return debugConfigs[0];
  }

  return await promptSelectDebugConfig(context, debugConfigs);
}

/**
 * Gets configurations property of launch.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @returns {DebugConfiguration[]} Launch configuration.
 */
export function getDebugConfigs(folder: WorkspaceFolder): DebugConfiguration[] {
  return getLaunchConfig(folder).get<DebugConfiguration[]>(configurationsKey) || [];
}

/**
 * Gets version property of launch.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @returns {string | undefined} Launch.json version.
 */
export function getLaunchVersion(folder: WorkspaceFolder): string | undefined {
  return getLaunchConfig(folder).get<string>(versionKey);
}

/**
 * Updates configurations property in launch.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @param {DebugConfiguration[]} configs - Launch configurations to update to.
 */
export function updateDebugConfigs(folder: WorkspaceFolder, configs: DebugConfiguration[]): void {
  getLaunchConfig(folder).update(configurationsKey, configs);
}

/**
 * Updates version property in launch.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @param {string} version - Version to update to.
 */
export function updateLaunchVersion(folder: WorkspaceFolder, version: string): void {
  getLaunchConfig(folder).update(versionKey, version);
}

/**
 * Checks if debug configurations are equal.
 * @param {DebugConfiguration} c1 - Workspace folder.
 * @param {DebugConfiguration} c2 - Workspace folder.
 * @returns {boolean} Returns true if both configurations are equal.
 */
export function isDebugConfigEqual(c1: DebugConfiguration, c2: DebugConfiguration): boolean {
  return c1.name === c2.name && c1.request === c2.request && isTypeEqual(c1.type, c2.type);
}

/**
 * Prompts the user to select a debug configuration.
 * @param {IActionContext} context - The action context.
 * @param {DebugConfiguration[]} debugConfigs - The debug configuration options.
 * @returns {Promise<DebugConfiguration>} - A promise that resolves to the selected debug configuration or undefined if one couldn't be retrieved.
 */
async function promptSelectDebugConfig(
  context: IActionContext,
  debugConfigs: DebugConfiguration[]
): Promise<DebugConfiguration | undefined> {
  if (isNullOrUndefined(debugConfigs) || debugConfigs.length === 0) {
    return undefined;
  }

  const debugConfigPicks = debugConfigs.map((debugConfig) => ({
    label: debugConfig.name,
    data: debugConfig,
  }));

  const placeHolder = localize('selectDebugConfig', 'Select the debug configuration for your logic app project.');
  try {
    const selectedItem = await context.ui.showQuickPick(debugConfigPicks, { placeHolder });
    return selectedItem?.data;
  } catch (err) {
    if (err instanceof UserCancelledError) {
      return undefined;
    }
    throw err;
  }
}

/**
 * Gets launch workspace configuration.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @returns {WorkspaceConfiguration} Workspace configuration.
 */
function getLaunchConfig(folder: WorkspaceFolder): WorkspaceConfiguration {
  return workspace.getConfiguration(launchKey, folder.uri);
}

function isTypeEqual(type1: string, type2: string): boolean {
  return type1 === type2 || (isNodeType(type1) && isNodeType(type2));
}

/**
 * Special case node debug type because it can be either "node" or "node2"
 * https://github.com/microsoft/vscode-azurefunctions/issues/1259
 */
function isNodeType(t: string): boolean {
  return /^node2?$/i.test(t);
}
