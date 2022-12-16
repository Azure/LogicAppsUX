/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { func } from './constants';
import type { AzExtTreeDataProvider, AzExtTreeItem, IActionContext, IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import type * as cp from 'child_process';
import type { ExtensionContext, TreeView, WebviewPanel } from 'vscode';

/**
 * Used for extensionVariables that can also be set per-action
 */
class ActionVariable<T> {
  private extensionVariable: T | undefined;
  private key: string;

  public constructor(key: string) {
    this.key = key;
  }

  public registerActionVariable(value: T, context: IActionContext): void {
    context[this.key] = value;
  }

  public registerExtensionVariable(value: T): void {
    this.extensionVariable = value;
  }

  public get(context: IActionContext): T {
    if (context[this.key] !== undefined) {
      return context[this.key] as T;
    } else if (this.extensionVariable !== undefined) {
      return this.extensionVariable as T;
    } else {
      throw new Error(`Internal Error: "${this.key}" must be registered before use.`);
    }
  }
}

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ext {
  export let context: ExtensionContext;
  export let workflowDesignTimePort: number;
  export let workflowDesignChildProcess: cp.ChildProcess | undefined;
  export let outputChannel: IAzExtOutputChannel;
  export const prefix = 'logicAppsExtension';

  // Tree item view
  export let azureAccountTreeItem: AzureAccountTreeItemWithProjects;
  export let tree: AzExtTreeDataProvider;
  export let treeView: TreeView<AzExtTreeItem>;
  export const treeViewName = 'newAzLogicApps';
  export let deploymentFolderPath: string;

  // Templates
  export const templateProvider = new ActionVariable<any>('_centralTemplateProvider'); // TODO

  // Functions
  export const funcCliPath: string = func;

  // WebViews
  export enum webViewKey {
    designerLocal = 'designerLocal',
    designerAzure = 'designerAzure',
  }
  export const openWebviewPanels: Record<string, Record<string, WebviewPanel>> = {
    [webViewKey.designerLocal]: {},
    [webViewKey.designerAzure]: {},
  };
}
