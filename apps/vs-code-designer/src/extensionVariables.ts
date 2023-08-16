/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { dotnet, func, node } from './constants';
import type { IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import type { AzureHostExtensionApi } from '@microsoft/vscode-azext-utils/hostapi';
import type * as cp from 'child_process';
import type { ExtensionContext, WebviewPanel } from 'vscode';

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ext {
  export let context: ExtensionContext;
  export let workflowDesignTimePort: number;
  export let workflowDesignChildProcess: cp.ChildProcess | undefined;
  export let outputChannel: IAzExtOutputChannel;
  export let workflowRuntimePort: number;
  export let extensionVersion: string;
  export const prefix = 'azureLogicAppsStandard';

  // Tree item view
  export let azureAccountTreeItem: AzureAccountTreeItemWithProjects;
  export const treeViewName = 'azLogicApps';
  export let deploymentFolderPath: string;

  // Resource group API
  export let rgApi: AzureHostExtensionApi;

  // Functions
  export const funcCliPath: string = func;

  // DotNet
  export const dotNetCliPath: string = dotnet;

  // Node Js
  export const nodeJsCliPath: string = node;

  // WebViews
  export enum webViewKey {
    designerLocal = 'designerLocal',
    designerAzure = 'designerAzure',
    monitoring = 'monitoring',
    export = 'export',
    overview = 'overview',
  }

  export const openWebviewPanels: Record<string, Record<string, WebviewPanel>> = {
    [webViewKey.designerLocal]: {},
    [webViewKey.designerAzure]: {},
    [webViewKey.monitoring]: {},
    [webViewKey.export]: {},
    [webViewKey.overview]: {},
  };
}

export enum ExtensionCommand {
  select_folder = 'select-folder',
  initialize = 'initialize',
  loadRun = 'LoadRun',
  dispose = 'dispose',
  initialize_frame = 'initialize-frame',
  update_access_token = 'update-access-token',
  update_export_path = 'update-export-path',
  export_package = 'export-package',
  add_status = 'add-status',
  set_final_status = 'set-final-status',
}
