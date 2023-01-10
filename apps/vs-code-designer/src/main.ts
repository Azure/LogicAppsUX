import { runPostWorkflowCreateStepsFromCache } from './app/commands/createCodeless/createCodelessSteps/WorkflowCreateStepBase';
import { validateFuncCoreToolsIsLatest } from './app/commands/funcCoreTools/validateFuncCoreToolsIsLatest';
import { registerCommands } from './app/commands/registerCommands';
import { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { stopDesignTimeApi } from './app/utils/codeless/startDesignTimeApi';
import { registerFuncHostTaskEvents } from './app/utils/funcCoreTools/funcHostTask';
import { extensionCommand } from './constants';
import { ext } from './extensionVariables';
import { registerAppServiceExtensionVariables } from '@microsoft/vscode-azext-azureappservice';
import {
  AzExtTreeDataProvider,
  callWithTelemetryAndErrorHandling,
  createAzExtOutputChannel,
  registerUIExtensionVariables,
} from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

const perfStats = {
  loadStartTime: Date.now(),
  loadEndTime: undefined,
};

export async function activate(context: vscode.ExtensionContext) {
  ext.context = context;

  ext.outputChannel = createAzExtOutputChannel('New Azure Logic Apps (Standard)', ext.prefix);

  registerUIExtensionVariables(ext);
  registerAppServiceExtensionVariables(ext);

  await callWithTelemetryAndErrorHandling(extensionCommand.activate, async (activateContext: IActionContext) => {
    activateContext.telemetry.properties.isActivationEvent = 'true';
    activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

    runPostWorkflowCreateStepsFromCache();

    validateFuncCoreToolsIsLatest();

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

export function deactivateInternal(): Promise<any> {
  stopDesignTimeApi();
  return undefined;
}

perfStats.loadEndTime = Date.now();
