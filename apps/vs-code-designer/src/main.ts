import { registerCommands } from './app/commands/registerCommands';
import { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { stopDesignTimeApi } from './app/utils/codeless/startDesignTimeApi';
import { extensionCommand } from './constants';
import { ext } from './extensionVariables';
import { registerAppServiceExtensionVariables } from '@microsoft/vscode-azext-azureappservice';
import {
  AzExtTreeDataProvider,
  callWithTelemetryAndErrorHandling,
  createAzExtOutputChannel,
  registerUIExtensionVariables,
} from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext) {
  ext.context = context;

  ext.outputChannel = createAzExtOutputChannel('New Azure Logic Apps (Standard)', ext.prefix);
  context.subscriptions.push(ext.outputChannel);

  registerUIExtensionVariables(ext);
  registerAppServiceExtensionVariables(ext);

  await callWithTelemetryAndErrorHandling(extensionCommand.activate, async () => {
    ext.azureAccountTreeItem = new AzureAccountTreeItemWithProjects();
    context.subscriptions.push(ext.azureAccountTreeItem);
    ext.tree = new AzExtTreeDataProvider(ext.azureAccountTreeItem, extensionCommand.loadMore);
    ext.treeView = vscode.window.createTreeView('azLogicApps', {
      treeDataProvider: ext.tree,
      showCollapseAll: true,
    });
    context.subscriptions.push(ext.treeView);

    registerCommands();
  });
}

export function deactivateInternal(): Promise<any> {
  stopDesignTimeApi();
  return undefined;
}
