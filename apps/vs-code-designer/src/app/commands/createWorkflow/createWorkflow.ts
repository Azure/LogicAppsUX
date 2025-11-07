/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { createWorkspaceWebviewCommandHandler } from '../shared/workspaceWebviewCommandHandler';
import { localize } from '../../../localize';
import { createLogicAppWorkflow } from './createLogicAppWorkflow';

export async function createWorkflow(): Promise<void> {
  await createWorkspaceWebviewCommandHandler({
    panelName: localize('createWorkflow', 'Create workflow'),
    panelGroupKey: ext.webViewKey.createWorkflow,
    projectName: ProjectName.createWorkflow,
    createCommand: ExtensionCommand.createWorkflow,
    createHandler: async (context: IActionContext, data: any) => {
      await createLogicAppWorkflow(context, data, false);
    },
  });
}
