/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { createLogicAppWorkspace } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { createWorkspaceWebviewCommandHandler } from '../shared/workspaceWebviewCommandHandler';

export async function createWorkspace(): Promise<void> {
  await createWorkspaceWebviewCommandHandler({
    panelName: localize('createWorkspace', 'Create workspace'),
    panelGroupKey: ext.webViewKey.createWorkspace,
    projectName: ProjectName.createWorkspace,
    createCommand: ExtensionCommand.createWorkspace,
    createHandler: async (context: IActionContext, data: any) => {
      await createLogicAppWorkspace(context, data, false);
    },
  });
}
