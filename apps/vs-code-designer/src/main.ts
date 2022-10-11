import { registerCommands } from './app/commands/registerCommands';
import { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { stopDesignTimeApi } from './app/utils/codeless/startDesignTimeApi';
import { ext } from './extensionVariables';
import { callWithTelemetryAndErrorHandling, createAzExtOutputChannel, registerUIExtensionVariables } from '@microsoft/vscode-azext-utils';
import type { ExtensionContext } from 'vscode';

export async function activate(context: ExtensionContext) {
  ext.context = context;

  ext.outputChannel = createAzExtOutputChannel('Azure Logic Apps (Standard)', ext.prefix);
  context.subscriptions.push(ext.outputChannel);

  registerUIExtensionVariables(ext);

  await callWithTelemetryAndErrorHandling('logicAppsExtension.activate', async () => {
    ext.azureAccountTreeItem = new AzureAccountTreeItemWithProjects();

    registerCommands();
  });
}

export function deactivateInternal(): Promise<any> {
  stopDesignTimeApi();
  return undefined;
}
