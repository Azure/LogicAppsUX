/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { DebugConfiguration, WorkspaceConfiguration, WorkspaceFolder } from 'vscode';
import { workspace } from 'vscode';

const configurationsKey = 'configurations';
const launchKey = 'launch';
const versionKey = 'version';

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
