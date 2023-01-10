import { runPostFunctionCreateStepsFromCache } from './app/commands/createCodeless/createCodelessSteps/WorkflowCreateStepBase';
import { registerCommands } from './app/commands/registerCommands';
import { registerFuncHostTaskEvents } from './app/funcCoreTools/funcHostTask';
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

  registerUIExtensionVariables(ext);
  registerAppServiceExtensionVariables(ext);

  await callWithTelemetryAndErrorHandling(extensionCommand.activate, async () => {
    runPostFunctionCreateStepsFromCache();

    ext.azureAccountTreeItem = new AzureAccountTreeItemWithProjects();
    ext.tree = new AzExtTreeDataProvider(ext.azureAccountTreeItem, extensionCommand.loadMore);
    ext.treeView = vscode.window.createTreeView(ext.treeViewName, {
      treeDataProvider: ext.tree,
      showCollapseAll: true,
    });

    context.subscriptions.push(ext.outputChannel);
    context.subscriptions.push(ext.azureAccountTreeItem);
    context.subscriptions.push(ext.treeView);

    registerCommands();
    registerFuncHostTaskEvents();
  });
}

export function deactivate(): Promise<any> {
  stopDesignTimeApi();
  return undefined;
}
