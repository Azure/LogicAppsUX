/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand } from '../../constants';
import { ext } from '../../extensionVariables';
import { executeOnFunctions } from '../functionsExtension/executeOnFunctionsExt';
import { createCodeless } from './createCodeless/createCodeless';
import { createLogicApp, createLogicAppAdvanced } from './createLogicApp/createLogicApp';
import { createNewProjectFromCommand } from './createNewProject/createNewProject';
import { deployProductionSlot, deploySlot } from './deploy/deploy';
import { openFile } from './openFile';
import { openDesigner } from './workflows/openDesigner/openDesigner';
import { viewContent } from './workflows/viewContent';
import type { FileTreeItem } from '@microsoft/vscode-azext-azureappservice';
import { registerSiteCommand } from '@microsoft/vscode-azext-azureappservice';
import { registerCommand } from '@microsoft/vscode-azext-utils';
import type { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { commands } from 'vscode';

export function registerCommands(): void {
  registerCommand(extensionCommand.openDesigner, openDesigner);
  registerCommand(
    extensionCommand.loadMore,
    async (context: IActionContext, node: AzExtTreeItem) => await ext.tree.loadMore(node, context)
  );
  registerCommand(extensionCommand.selectSubscriptions, () => commands.executeCommand(extensionCommand.azureSelectSubscriptions));
  registerCommand(extensionCommand.openFile, (context: IActionContext, node: FileTreeItem) =>
    executeOnFunctions(openFile, context, context, node)
  );
  registerCommand(extensionCommand.viewContent, viewContent);
  registerCommand(extensionCommand.createNewProject, createNewProjectFromCommand);
  registerCommand(extensionCommand.createCodeless, createCodeless);
  registerCommand(extensionCommand.createLogicApp, createLogicApp);
  registerCommand(extensionCommand.createLogicAppAdvanced, createLogicAppAdvanced);
  registerSiteCommand(extensionCommand.deploy, deployProductionSlot);
  registerSiteCommand(extensionCommand.deploySlot, deploySlot);
  registerCommand(extensionCommand.showOutputChannel, () => {
    ext.outputChannel.show();
  });
}
