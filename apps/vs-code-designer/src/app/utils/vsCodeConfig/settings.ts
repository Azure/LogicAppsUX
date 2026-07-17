/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { useNodeDesignTimeWorkerSetting } from '../../../constants';
import { isString } from '@microsoft/logic-apps-shared';
import type { IActionContext, IAzureQuickPickItem, IAzureQuickPickOptions } from '@microsoft/vscode-azext-utils';
import { openUrl } from '@microsoft/vscode-azext-utils';
import { FuncVersion, Platform, ProjectLanguage, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
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
  const result: { globalValue?: T; defaultValue?: T } | undefined = projectConfiguration.inspect<T>(key);
  return result && (result.globalValue ?? result.defaultValue);
}

/**
 * Updates a global setting in the VS Code configuration.
 * @param {string} section - The section of the configuration to update.
 * @param {T} value - The new value for the setting.
 * @param {string} prefix - The prefix for the configuration section (default: ext.prefix).
 * @returns A promise that resolves when the setting is updated.
 */
export async function updateGlobalSetting<T = string>(section: string, value: T, prefix: string = ext.prefix): Promise<void> {
  const projectConfiguration: WorkspaceConfiguration = workspace.getConfiguration(prefix);
  await projectConfiguration.update(section, value, ConfigurationTarget.Global);
}

/**
 * Searches through all open folders and gets the current workspace setting (as long as there are no conflicts)
 * Uses ext.prefix 'azureLogicAppsStandard' unless otherwise specified
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
  }
  return getGlobalSetting(key, prefix);
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
 * Uses ext.prefix 'azureLogicAppsStandard' unless otherwise specified
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

/**
 * Resolves whether the shared design-time host should fall back to the Node worker instead of running
 * in-process .NET 8. Defaults to false (dotnet + FUNCTIONS_INPROC_NET8_ENABLED), which is required for the
 * Data Mapper Test map's NetFxWorker. Users can opt into the Node worker via the
 * `azureLogicAppsStandard.useNodeDesignTimeWorker` setting if the .NET 8 host is problematic for them.
 * @param {string | WorkspaceFolder} [fsPath] - Optional project path/folder to scope the setting lookup.
 * @returns {boolean} True when the Node-worker fallback is enabled.
 */
export function useNodeDesignTimeWorker(fsPath?: string | WorkspaceFolder): boolean {
  return getWorkspaceSetting<boolean>(useNodeDesignTimeWorkerSetting, fsPath) === true;
}

function getScope(fsPath: WorkspaceFolder | string | undefined): Uri | WorkspaceFolder | undefined {
  return isString(fsPath) ? Uri.file(fsPath) : fsPath;
}

function osSupportsVersion(version: FuncVersion | undefined): boolean {
  return version !== FuncVersion.v1 || process.platform === Platform.windows;
}

/**
 * Prompts dialog to gets a functions core tools to install.
 * @param {IActionContext} context - Command context.
 * @param {string} message - Message for dialog.
 * @returns {Promise<FuncVersion>} Returns core tools version to install.
 */
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

export const createSettingsDetails = (settingsList: string[]) => {
  try {
    const extensionConfiguration = workspace.getConfiguration(ext.prefix);
    const settings: Record<string, unknown> = {};
    for (const key of settingsList) {
      settings[key] = extensionConfiguration.get(key) ?? false;
    }
    return settings;
  } catch {
    return {};
  }
};
