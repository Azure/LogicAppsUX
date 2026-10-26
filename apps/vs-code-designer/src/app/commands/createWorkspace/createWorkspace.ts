/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { createLogicAppWorkspace } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { createWorkspaceWebviewCommandHandler } from '../shared/workspaceWebviewCommandHandler';

export async function createWorkspace(_context: IActionContext): Promise<void> {
  await createWorkspaceWebviewCommandHandler({
    panelName: localize('createWorkspace', 'Create workspace'),
    panelGroupKey: ext.webViewKey.createWorkspace,
    projectName: ProjectName.createWorkspace,
    createCommand: ExtensionCommand.createWorkspace,
    createHandler: async (data: any) => {
      // NOTE(aeldridge): In order to avoid collision in telemetry with registered command events, createHandler scopes use the createCommand as callbackId.
      await callWithTelemetryAndErrorHandling(ExtensionCommand.createWorkspace, async (actionContext: IActionContext) => {
        await createLogicAppWorkspace(actionContext, data, false);
      });
    },
  });
}
