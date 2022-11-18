import { registerCommands } from './app/commands/registerCommands';
import { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { stopDesignTimeApi } from './app/utils/codeless/startDesignTimeApi';
import { ext } from './extensionVariables';
import { callWithTelemetryAndErrorHandling, createAzExtOutputChannel, registerUIExtensionVariables } from '@microsoft/vscode-azext-utils';
import type { ExtensionContext } from 'vscode';

export async function activate(context: ExtensionContext) {
  await callWithTelemetryAndErrorHandling('logicAppsExtension.activate', async () => {
    ext.azureAccountTreeItem = new AzureAccountTreeItemWithProjects();
    ext.context = context;
    ext.outputChannel = createAzExtOutputChannel('Azure Logic Apps (Standard)', ext.prefix);

    registerUIExtensionVariables(ext);

    context.subscriptions.push(ext.azureAccountTreeItem);
    context.subscriptions.push(ext.outputChannel);

    registerCommands();
  });
}

export function deactivateInternal(): Promise<any> {
  stopDesignTimeApi();
  return undefined;
}
