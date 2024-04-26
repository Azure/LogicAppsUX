/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type DataMapperPanel from './app/commands/dataMapper/DataMapperPanel';
import type { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import type { TestData } from './app/tree/unitTestTree';
import { dotnet, func, node, npm } from './constants';
import type { Site } from '@azure/arm-appservice';
import type { IActionContext, IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import type { AzureHostExtensionApi } from '@microsoft/vscode-azext-utils/hostapi';
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
} from 'vscode';

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */

type DataMapperPanelDictionary = { [key: string]: DataMapperPanel }; // key == dataMapName

// biome-ignore lint/style/noNamespace:
export namespace ext {
  export let context: ExtensionContext;
  export let designTimePort: number;
  export let designChildProcess: cp.ChildProcess | undefined;
  export let workflowDotNetProcess: cp.ChildProcess | undefined;
  export let workflowNodeProcess: cp.ChildProcess | undefined;
  export let logicAppWorkspace: string;
  export let outputChannel: IAzExtOutputChannel;
  export let workflowRuntimePort: number;
  export let extensionVersion: string;
  export let bundleFolderRoot: string | undefined;
  export const prefix = 'azureLogicAppsStandard';

  // Tree item view
  export let azureAccountTreeItem: AzureAccountTreeItemWithProjects;
  export const treeViewName = 'azLogicApps';
  export let deploymentFolderPath: string;
  export const logicAppSitesMap: Map<string, Map<string, Site>> = new Map();

  // Resource group API
  export let rgApi: AzureHostExtensionApi;

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

  export const showError = (errMsg: string) => {
    ext.log(errMsg);
    window.showErrorMessage(errMsg);
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
