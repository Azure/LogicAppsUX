/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { useNodeDesignTimeWorkerSetting } from '../../constants';
import { localize } from '../../localize';
import { startAllDesignTimeApis, stopAllDesignTimeApis } from '../utils/codeless/startDesignTimeApi';
import { updateWorkspaceSetting, useNodeDesignTimeWorker } from '../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

/**
 * Toggles the `azureLogicAppsStandard.useNodeDesignTimeWorker` workspace setting and restarts the
 * design-time host so the change takes effect immediately. This is the user-facing escape hatch for the
 * design-time worker runtime: by default the host runs in-process .NET 8 (required by the Data Mapper Test
 * map's NetFxWorker); enabling the fallback runs it on the Node worker instead.
 * @param {IActionContext} context - The action context.
 */
export async function toggleDesignTimeNodeWorker(context: IActionContext): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    vscode.window.showWarningMessage(
      localize('noWorkspaceForDesignTimeWorker', 'Open a Logic Apps workspace before changing the design-time worker runtime.')
    );
    return;
  }

  const enableNodeWorker = !useNodeDesignTimeWorker(folders[0].uri.fsPath);
  for (const folder of folders) {
    await updateWorkspaceSetting(useNodeDesignTimeWorkerSetting, enableNodeWorker, folder.uri.fsPath);
  }
  context.telemetry.properties.useNodeDesignTimeWorker = String(enableNodeWorker);

  const message = enableNodeWorker
    ? localize(
        'designTimeNodeWorkerEnabled',
        'Design-time host set to the Node.js worker (fallback). The Data Mapper Test map is unavailable in this mode. Restarting the design-time host…'
      )
    : localize('designTimeNodeWorkerDisabled', 'Design-time host set to in-process .NET 8 (default). Restarting the design-time host…');
  vscode.window.showInformationMessage(message);

  // Restart the design-time host so the regenerated local.settings.json (with the new worker runtime) is picked up.
  await stopAllDesignTimeApis();
  await startAllDesignTimeApis();
}
