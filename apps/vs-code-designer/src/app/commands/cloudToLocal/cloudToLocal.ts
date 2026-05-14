/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { ext } from '../../../extensionVariables';
import { createLogicAppWorkspace } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { createWorkspaceWebviewCommandHandler } from '../shared/workspaceWebviewCommandHandler';

export async function cloudToLocal(): Promise<void> {
  await createWorkspaceWebviewCommandHandler({
    panelName: localize('createWorkspaceFromPackage', 'Create workspace from package'),
    panelGroupKey: ext.webViewKey.createWorkspaceFromPackage,
    projectName: ProjectName.createWorkspaceFromPackage,
    createCommand: ExtensionCommand.createWorkspaceFromPackage,
    createHandler: async (context: IActionContext, data: any) => {
      await createLogicAppWorkspace(context, data, true);
    },
    dialogOptions: {
      package: {
        canSelectMany: false,
        defaultUri: vscode.Uri.file(path.join(os.homedir(), 'Downloads')),
        openLabel: localize('selectPackageFile', 'Select package file'),
        filters: { Packages: ['zip'] },
      },
    },
  });
}
