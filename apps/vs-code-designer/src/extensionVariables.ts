/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import type { IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
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
  export let azureAccountTreeItem: AzureAccountTreeItemWithProjects;

  export const prefix = 'azureLogicAppsStandard';

  export enum webViewKey {
    designerLocal = 'designerLocal',
  }

  export const openWebviewPanels: Record<string, Record<string, WebviewPanel>> = {
    [webViewKey.designerLocal]: {},
  };
}
