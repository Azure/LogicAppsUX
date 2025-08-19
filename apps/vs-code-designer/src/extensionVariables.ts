/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';
import type DataMapperPanel from './app/commands/dataMapper/DataMapperPanel';
import type { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import type { TestData } from './app/tree/unitTestTree';
import { dotnet, func, node, npm } from './constants';
import type { ContainerApp, Site } from '@azure/arm-appservice';
import type { IActionContext, IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import type { AzureHostExtensionApi } from '@microsoft/vscode-azext-utils/hostapi';
import type TelemetryReporter from '@vscode/extension-telemetry';
import type * as cp from 'child_process';
import {
  window,
  type ExtensionContext,
  type WebviewPanel,
  type TestItem,
  type TestRunProfile,
  EventEmitter,
  type Uri,
  type TestController,
  type MessageOptions,
} from 'vscode';
import type { AzureResourcesExtensionApi } from '@microsoft/vscode-azureresources-api';
import type { LanguageClient } from 'vscode-languageclient/node';

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */

type DataMapperPanelDictionary = { [key: string]: DataMapperPanel }; // key == dataMapName
type LogicAppMap = Map<string, Site>;
type SubscriptionMap = Map<string, LogicAppMap>;
type DesignTimeInstance = {
  process?: cp.ChildProcess;
  childFuncPid?: string;
  port?: number;
  isStarting?: boolean;
};

// biome-ignore lint/style/noNamespace:
export namespace ext {
  export let context: ExtensionContext;
  export const designTimeInstances: Map<string, DesignTimeInstance> = new Map();
  export let workflowDotNetProcess: cp.ChildProcess | undefined;
  export let workflowNodeProcess: cp.ChildProcess | undefined;
  export let defaultLogicAppPath: string;
  export let outputChannel: IAzExtOutputChannel;
  export let workflowRuntimePort: number;
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
    designerAzure: 'designerAzure',
    monitoring: 'monitoring',
    export: 'export',
    overview: 'overview',
    unitTest: 'unitTest',
    languageServer: 'languageServer',
  } as const;
  export type webViewKey = keyof typeof webViewKey;

  export const openWebviewPanels: Record<string, Record<string, WebviewPanel>> = {
    [webViewKey.designerLocal]: {},
    [webViewKey.designerAzure]: {},
    [webViewKey.monitoring]: {},
    [webViewKey.export]: {},
    [webViewKey.overview]: {},
  };

  export const log = (text: string) => {
    ext.outputChannel.appendLine(text);
    ext.outputChannel.show();
  };

  export const showWarning = (errMsg: string) => {
    ext.log(errMsg);
    window.showWarningMessage(errMsg);
  };

  export const showInformation = (msg: string) => {
    window.showInformationMessage(msg);
  };

  export const showError = (errMsg: string, options?: MessageOptions) => {
    ext.log(errMsg);
    if (options && options.detail) {
      ext.log(options.detail);
    }
    window.showErrorMessage(errMsg, options);
  };

  export const logTelemetry = (context: IActionContext, key: string, value: string) => {
    context.telemetry.properties[key] = value;
  };

  // Unit Test
  export const watchingTests = new Map<TestItem | 'ALL', TestRunProfile | undefined>();
  export const testFileChangedEmitter = new EventEmitter<Uri>();
  export const testData = new WeakMap<TestItem, TestData>();
  export let unitTestController: TestController;
  export const testRuns = new Map<string, any>();
  // Telemetry
  export let telemetryReporter: TelemetryReporter;

  // Language server protocol
  export let client: LanguageClient | undefined;
}

export const ExtensionCommand = {
  select_folder: 'select-folder',
  initialize: 'initialize',
  loadRun: 'LoadRun',
  dispose: 'dispose',
  initialize_frame: 'initialize-frame',
  update_access_token: 'update-access-token',
  update_export_path: 'update-export-path',
  export_package: 'export-package',
  add_status: 'add-status',
  set_final_status: 'set-final-status',
};
export type ExtensionCommand = keyof typeof ExtensionCommand;
