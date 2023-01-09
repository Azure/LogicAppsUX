/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { isString } from '@microsoft/utils-logic-apps';
import type { IActionContext, IAzureQuickPickItem, IAzureQuickPickOptions } from '@microsoft/vscode-azext-utils';
import { openUrl } from '@microsoft/vscode-azext-utils';
import { FuncVersion, ProjectLanguage, WorkerRuntime } from '@microsoft/vscode-extension';
import { Uri, workspace } from 'vscode';
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

function osSupportsVersion(version: FuncVersion | undefined): boolean {
  return version !== FuncVersion.v1 || process.platform === 'win32';
}

export async function promptForFuncVersion(context: IActionContext, message?: string): Promise<FuncVersion> {
  const recommended: string = localize('recommended', '(Recommended)');
  let picks: IAzureQuickPickItem<FuncVersion | undefined>[] = [
    { label: 'Azure Functions v4', description: recommended, data: FuncVersion.v4 },
    { label: 'Azure Functions v3', data: FuncVersion.v3 },
    { label: 'Azure Functions v2', data: FuncVersion.v2 },
    { label: 'Azure Functions v1', data: FuncVersion.v1 },
  ];

  picks = picks.filter((p) => osSupportsVersion(p.data));

  picks.push({ label: localize('learnMore', '$(link-external) Learn more...'), description: '', data: undefined });

  const options: IAzureQuickPickOptions = {
    placeHolder: message || localize('selectVersion', 'Select a version'),
    suppressPersistence: true,
  };

  const version: FuncVersion | undefined = (await context.ui.showQuickPick(picks, options)).data;
  if (version === undefined) {
    await openUrl('https://aka.ms/AA1tpij');
  } else {
    return version;
  }
}
