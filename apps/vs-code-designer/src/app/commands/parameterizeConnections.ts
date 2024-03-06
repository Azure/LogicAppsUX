/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parameterizeConnectionsInProjectLoadSetting } from '../../constants';
import { localize } from '../../localize';
import { getConnectionsJson } from '../utils/codeless/connection';
import { tryGetLogicAppProjectRoot } from '../utils/verifyIsProject';
import { getGlobalSetting, updateGlobalSetting } from '../utils/vsCodeConfig/settings';
import { getWorkspaceFolder } from '../utils/workspace';
import { DialogResponses, type IActionContext } from '@microsoft/vscode-azext-utils';
import { window, workspace } from 'vscode';

/**
 * Prompts the user to parameterize connections at project load.
 *
 * @param {IActionContext} context - The action context.
 * @returns A promise that resolves when the operation is complete.
 */
export async function promptParameterizeConnections(context: IActionContext): Promise<void> {
  const message = localize('useBinaries', 'Allow connections to be parameterized at project load.');
  const confirm = { title: localize('yesRecommended', 'Yes (Recommended)') };
  const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);

  if (parameterizeConnectionsSetting === null) {
    const result = await context.ui.showWarningMessage(message, confirm, DialogResponses.no, DialogResponses.dontWarnAgain);
    if (result === confirm) {
      await updateGlobalSetting(parameterizeConnectionsInProjectLoadSetting, true);
      context.telemetry.properties.parameterizeConnectionsInProjectLoadSetting = 'true';
    } else if (result === DialogResponses.dontWarnAgain) {
      await updateGlobalSetting(parameterizeConnectionsInProjectLoadSetting, false);
      context.telemetry.properties.parameterizeConnectionsInProjectLoadSetting = 'false';
    }
  } else if (parameterizeConnectionsSetting) {
    parameterizeConnections(context);
  }
}

export async function parameterizeConnections(context: IActionContext): Promise<void> {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

    if (projectPath) {
      const connectionsJson = await getConnectionsJson(projectPath);
      console.log(connectionsJson);
      window.showInformationMessage(localize('finishedParameterizingConnections', 'Finished parameterizing connections.'));
    }
  }
}
