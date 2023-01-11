/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { isString } from '@microsoft/utils-logic-apps';
import { ProjectLanguage, WorkerRuntime } from '@microsoft/vscode-extension';
import { ConfigurationTarget, Uri, workspace } from 'vscode';
import type { WorkspaceConfiguration, WorkspaceFolder } from 'vscode';

/**
 * Gets global setting from vscode.
 * @param {string} key - Setting key.
 * @param {string} prefix - Extension prefix.
 * @returns {T | undefined} Returns the setting from the workspace.
 */
export function getGlobalSetting<T>(key: string, prefix: string = ext.prefix): T | undefined {
  const projectConfiguration: WorkspaceConfiguration = workspace.getConfiguration(prefix);
  const result: { globalValue?: T } | undefined = projectConfiguration.inspect<T>(key);
  return result && result.globalValue;
}

/**
 * Searches through all open folders and gets the current workspace setting (as long as there are no conflicts)
 * Uses ext.prefix 'azureFunctions' unless otherwise specified
 */
export function getWorkspaceSettingFromAnyFolder(key: string, prefix: string = ext.prefix): string | undefined {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    let result: string | undefined;
    for (const folder of workspace.workspaceFolders) {
      const projectConfiguration: WorkspaceConfiguration = workspace.getConfiguration(prefix, folder.uri);
      const folderResult: string | undefined = projectConfiguration.get<string>(key);
      if (!result) {
        result = folderResult;
      } else if (folderResult && result !== folderResult) {
        return undefined;
      }
    }
    return result;
  } else {
    return getGlobalSetting(key, prefix);
  }
}

export function getFunctionsWorkerRuntime(language: string | undefined): WorkerRuntime | undefined {
  switch (language) {
    case ProjectLanguage.JavaScript:
    case ProjectLanguage.TypeScript:
      return WorkerRuntime.Node;
    case ProjectLanguage.CSharp:
    case ProjectLanguage.FSharp:
      return WorkerRuntime.Dotnet;
    default:
      return undefined;
  }
}

/**
 * Uses ext.prefix 'azureFunctions' unless otherwise specified
 */
export async function updateWorkspaceSetting<T = string>(
  section: string,
  value: T,
  fsPath: string,
  prefix: string = ext.prefix
): Promise<void> {
  const projectConfiguration: WorkspaceConfiguration = workspace.getConfiguration(prefix, Uri.file(fsPath));
  await projectConfiguration.update(section, value);
}

/**
 * Gets a setting from the vscode workspace.
 * @param {string} key - Setting key.
 * @param {string | WorkspaceFolder} fsPath - Workspace path.
 * @param {string} prefix - Extension prefix.
 * @returns {T | undefined} Returns the setting from the workspace.
 */
export function getWorkspaceSetting<T>(key: string, fsPath?: string | WorkspaceFolder, prefix: string = ext.prefix): T | undefined {
  const projectConfiguration: WorkspaceConfiguration = workspace.getConfiguration(prefix, getScope(fsPath));
  return projectConfiguration.get<T>(key);
}

function getScope(fsPath: WorkspaceFolder | string | undefined): Uri | WorkspaceFolder | undefined {
  return isString(fsPath) ? Uri.file(fsPath) : fsPath;
}

/**
 * Uses ext.prefix 'azureFunctions' unless otherwise specified
 */
export async function updateGlobalSetting<T = string>(section: string, value: T, prefix: string = ext.prefix): Promise<void> {
  const projectConfiguration: WorkspaceConfiguration = workspace.getConfiguration(prefix);
  await projectConfiguration.update(section, value, ConfigurationTarget.Global);
}
