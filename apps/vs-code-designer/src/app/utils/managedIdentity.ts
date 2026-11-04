/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  designTimeDirectoryName,
  enableManagedIdentityAuthSetting,
  localSettingsFileName,
  workflowAuthenticationMethodKey,
  workflowAuthenticationMethodMIValue,
} from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { updateGlobalSetting } from './vsCodeConfig/settings';
import { addOrUpdateLocalAppSettings } from './appSettings/localSettings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { getLogicAppRoots } from './workspace';

/**
 * Enables local managed identity authentication by updating the relevant settings and local project configurations.
 *
 * @param {IActionContext} context - The action context.
 */
export async function enableLocalManagedIdentityAuth(context: IActionContext): Promise<void> {
  await updateGlobalSetting(enableManagedIdentityAuthSetting, true);
  await updateLocalSettingsForAllProjects(context);
  ext.outputChannel.appendLog(localize('managedIdentityAuthEnabled', 'Managed identity authentication has been enabled for local workflows.'));
}

/**
 * Iterates over all logic app projects and adds/updates `WORKFLOWS_AUTHENTICATION_METHOD` to
 * `managedServiceIdentity` in each Logic Apps project's `local.settings.json` and its
 * `workflow-designtime/local.settings.json` (when the design-time directory exists).
 */
async function updateLocalSettingsForAllProjects(context: IActionContext): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return;
  }

  const miSettings = {
    [workflowAuthenticationMethodKey]: workflowAuthenticationMethodMIValue,
  };

  const projectPaths = await getLogicAppRoots();
  const updateAppSettingsTasks = projectPaths.map(async (projectPath) => {
    try {
      await addOrUpdateLocalAppSettings(context, projectPath, miSettings);

      const designTimePath = path.join(projectPath, designTimeDirectoryName);
      if (await fse.pathExists(designTimePath)) {
        await addOrUpdateLocalAppSettings(context, designTimePath, miSettings, true);
      }
    } catch (error) {
      ext.outputChannel.appendLog(localize(
        'failedToUpdateLocalSettings',
        'Failed to update {0} in {1}: {2}',
        localSettingsFileName,
        projectPath,
        error instanceof Error ? error.message : String(error)
      ));
    }
  });

  await Promise.all(updateAppSettingsTasks);
}
