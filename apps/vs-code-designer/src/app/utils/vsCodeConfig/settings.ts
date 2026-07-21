/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { alwaysBuildCustomCodeSetting, enableManagedIdentityAuthSetting, useNodeDesignTimeWorkerSetting } from '../../../constants';
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
 * Removes a setting from the shared workspace scopes so it only lives in the user's global
 * settings. This strips the key from the multi-root `.code-workspace` file
 * (`ConfigurationTarget.Workspace`) and from every folder's `.vscode/settings.json`
 * (`ConfigurationTarget.WorkspaceFolder`).
 *
 * Used to migrate machine-local settings (absolute binary paths, terminal env, etc.) out of
 * files that get committed/shared in a repository. Each scope is only touched when a value is
 * actually present there (checked via `inspect`), so application/window-scoped settings that
 * cannot be written at workspace/folder scope are skipped instead of throwing. Any remaining
 * failure is swallowed and logged so it never breaks extension setup.
 * @param {string} section - The setting key (without prefix).
 * @param {string} prefix - The configuration prefix/section (default: ext.prefix).
 */
export async function removeSharedSetting(section: string, prefix: string = ext.prefix): Promise<void> {
  const config: WorkspaceConfiguration = workspace.getConfiguration(prefix);
  let removedAny = false;

  // Only remove the workspace-level value (the .code-workspace file) when one actually exists.
  // Application/window-scoped settings (e.g. terminal.integrated.env.*, omnisharp.dotNetCliPaths)
  // never have a workspace/folder value and cannot be written at those scopes, so attempting the
  // removal would throw needlessly.
  if (config.inspect(section)?.workspaceValue !== undefined) {
    removedAny = true;
    try {
      await config.update(section, undefined, ConfigurationTarget.Workspace);
    } catch (error) {
      ext.outputChannel?.appendLog(`[removeSharedSetting] Skipped workspace removal for ${prefix}.${section}: ${error}`);
    }
  }

  // Remove any folder-level values (each folder's .vscode/settings.json), again only where present.
  for (const folder of workspace.workspaceFolders ?? []) {
    const folderConfig: WorkspaceConfiguration = workspace.getConfiguration(prefix, folder.uri);
    if (folderConfig.inspect(section)?.workspaceFolderValue === undefined) {
      continue;
    }
    removedAny = true;
    try {
      await folderConfig.update(section, undefined, ConfigurationTarget.WorkspaceFolder);
    } catch (error) {
      ext.outputChannel?.appendLog(
        `[removeSharedSetting] Skipped folder removal for ${prefix}.${section} in ${folder.uri.fsPath}: ${error}`
      );
    }
  }

  // Nothing lived in a shared scope, so there's nothing to report — stay quiet.
  if (!removedAny) {
    return;
  }

  // Log where the value now resolves so the landing scope can be verified at runtime.
  // Only global and workspace values are meaningful from a non-resource-scoped inspection;
  // workspaceFolderValue is per-folder and would be ambiguous here, so it is intentionally
  // omitted (per-folder removals are already handled/logged in the loop above).
  const inspection = config.inspect(section);
  ext.outputChannel?.appendLog(
    `[removeSharedSetting] ${prefix}.${section} -> global=${JSON.stringify(inspection?.globalValue)}, ` +
      `workspace=${JSON.stringify(inspection?.workspaceValue)}`
  );
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

/**
 * Indicates whether the extension should enforce `WORKFLOWS_AUTHENTICATION_METHOD = managedServiceIdentity`
 * in local.settings.json. Controlled by the `azureLogicAppsStandard.enableManagedIdentityAuth` setting.
 * Defaults to `true` when the setting is absent or unset, or when the VS Code API is unavailable (e.g. in tests).
 */
export function isManagedIdentityAuthEnabled(): boolean {
  try {
    return getGlobalSetting<boolean>(enableManagedIdentityAuthSetting) !== false;
  } catch {
    return true;
  }
}

/**
 * Indicates whether custom code projects should always be rebuilt when opening the designer,
 * regardless of whether build artifacts already exist. Controlled by the
 * `azureLogicAppsStandard.alwaysBuildCustomCode` setting. Defaults to `false`.
 */
export function shouldAlwaysBuildCustomCode(): boolean {
  return getGlobalSetting<boolean>(alwaysBuildCustomCodeSetting) === true;
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
