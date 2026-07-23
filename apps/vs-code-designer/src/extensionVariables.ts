/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';
import type DataMapperPanel from './app/commands/dataMapper/DataMapperPanel';
import type { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { dotnet, func, managementApiPrefix, node, npm } from './constants';
import type { ContainerApp, Site } from '@azure/arm-appservice';
import type { IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import type { AzureHostExtensionApi } from '@microsoft/vscode-azext-utils/hostapi';
import type TelemetryReporter from '@vscode/extension-telemetry';
import type * as cp from 'child_process';
import { window, type ExtensionContext, type WebviewPanel, type MessageOptions } from 'vscode';
import type { AzureResourcesExtensionApi } from '@microsoft/vscode-azureresources-api';
import type { LanguageClient } from 'vscode-languageclient/node';

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */

type DataMapperPanelDictionary = { [key: string]: DataMapperPanel }; // key == dataMapName
type LogicAppMap = Map<string, Site>;
type SubscriptionMap = Map<string, LogicAppMap>;
type FuncInstance = {
  process?: cp.ChildProcess;
  childFuncPid?: string;
  port?: number;
  isStarting?: boolean;
  startupError?: string;
  startupPromise?: Promise<void>;
  validationRetryCount?: number;
};

// biome-ignore lint/style/noNamespace:
export namespace ext {
  export let context: ExtensionContext;
  export const designTimeInstances: Map<string, FuncInstance> = new Map();
  export const runtimeInstances: Map<string, FuncInstance> = new Map();
  export let workflowDotNetProcess: cp.ChildProcess | undefined;
  export let workflowNodeProcess: cp.ChildProcess | undefined;
  export let defaultLogicAppPath: string;
  export let outputChannel: IAzExtOutputChannel;
  // TODO(aeldridge): Multiple runtime processes are supported with runningFuncTaskMap, but only a single runtime port is tracked.
  // This will cause issues if multiple runtime processes are started on different ports. Currently we use the default port (7071)
  // unless user modifies the 'func: host start' task to use a different port so this issue isn't surfaced by default.
  export let workflowRuntimePort: number | undefined;
  export let extensionVersion: string;
  export let bundleFolderRoot: string | undefined;
  export const prefix = 'azureLogicAppsStandard';
  export const currentBundleVersion: Map<string, string> = new Map();
  export const pinnedBundleVersion: Map<string, boolean> = new Map();
  export let defaultBundleVersion: string;
  export let latestBundleVersion: string;

  // Services
  export let subscriptionProvider: VSCodeAzureSubscriptionProvider;

  // Tree item view
  export let azureAccountTreeItem: AzureAccountTreeItemWithProjects;
  export const treeViewName = 'azLogicApps';
  export let deploymentFolderPath: string;
  export const subscriptionHybridLogicAppMap: Map<string, Map<string, ContainerApp>> = new Map();
  export const subscriptionLogicAppMap: SubscriptionMap = new Map();

  // Resource group API
  export let rgApi: AzureHostExtensionApi;
  export let rgApiV2: AzureResourcesExtensionApi;

  // Data Mapper panel
  export const dataMapPanelManagers: DataMapperPanelDictionary = {};

  // Functions
  export const funcCliPath: string = func;

  // DotNet
  export const dotNetCliPath: string = dotnet;

  // Node Js
  export const nodeJsCliPath: string = node;
  export const npmCliPath: string = npm;

  // WebViews
  export const webViewKey = {
    designerLocal: 'designerLocal',
    designerLocalV2: 'designerLocalV2',
    designerAzure: 'designerAzure',
    designerAzureV2: 'designerAzureV2',
    monitoring: 'monitoring',
    export: 'export',
    overview: 'overview',
    languageServer: 'languageServer',
    createWorkspace: 'createWorkspace',
    createWorkspaceFromPackage: 'createWorkspaceFromPackage',
    createLogicApp: 'createLogicApp',
    createWorkflow: 'createWorkflow',
    createWorkspaceStructure: 'createWorkspaceStructure',
  } as const;
  export type webViewKey = keyof typeof webViewKey;

  export const openWebviewPanels: Record<string, Record<string, WebviewPanel>> = {
    [webViewKey.designerLocal]: {},
    [webViewKey.designerLocalV2]: {},
    [webViewKey.designerAzure]: {},
    [webViewKey.designerAzureV2]: {},
    [webViewKey.monitoring]: {},
    [webViewKey.export]: {},
    [webViewKey.createWorkspace]: {},
    [webViewKey.createWorkspaceFromPackage]: {},
    [webViewKey.createWorkspaceStructure]: {},
    [webViewKey.createLogicApp]: {},
    [webViewKey.createWorkflow]: {},
    [webViewKey.overview]: {},
    [webViewKey.languageServer]: {},
  };

  export const showError = (errMsg: string, options?: MessageOptions) => {
    ext.outputChannel.appendLine(errMsg);
    if (options && options.detail) {
      ext.outputChannel.appendLine(options.detail);
    }
    window.showErrorMessage(errMsg, options);
  };

  export function getWorkflowRuntimeBaseUrl(): string | undefined {
    return ext.workflowRuntimePort ? `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}` : undefined;
  }

  // Telemetry
  export let telemetryReporter: TelemetryReporter;
  export const telemetryString = 'setInGitHubBuild';

  // Language server protocol
  export let languageClient: LanguageClient | undefined;
}

export const ExtensionCommand = {
  select_folder: 'select-folder',
  initialize: 'initialize',
  loadRun: 'LoadRun',
  selectRun: 'SelectRun',
  dispose: 'dispose',
  initialize_frame: 'initialize-frame',
  update_access_token: 'update-access-token',
  update_export_path: 'update-export-path',
  update_workspace_path: 'update-workspace-path',
  update_package_path: 'update-package-path',
  export_package: 'export-package',
  add_status: 'add-status',
  set_final_status: 'set-final-status',
  workspace_folder: 'workspace-folder',
  workspace_file: 'workspace-file',
  workspace_existence_result: 'workspace-existence-result',
  package_existence_result: 'package-existence-result',
};
export type ExtensionCommand = keyof typeof ExtensionCommand;
