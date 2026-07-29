/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  designTimeDirectoryName,
  enableManagedIdentityAuthSetting,
  localSettingsFileName,
  suppressManagedIdentityAuthNotification,
  workflowAuthenticationMethodKey,
  workflowAuthenticationMethodMIValue,
} from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { isManagedIdentityAuthEnabled, updateGlobalSetting } from './vsCodeConfig/settings';
import { tryGetLogicAppProjectRoot } from './verifyIsProject';
import { addOrUpdateLocalAppSettings } from './appSettings/localSettings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Shows a non-blocking information message on startup prompting the user to enable managed identity
 * authentication for local workflows. The notification is suppressed if:
 * - The user has already enabled the setting.
 * - The user previously selected "Don't show again".
 *
 * @param {IActionContext} context - The action context for telemetry and error handling.
 */
export async function promptManagedIdentityAuth(context: IActionContext): Promise<void> {
  const isSuppressed = ext.context.globalState.get<boolean>(suppressManagedIdentityAuthNotification) === true;
  if (isSuppressed || isManagedIdentityAuthEnabled()) {
    return;
  }

  const enableButton = localize('enable', 'Enable');
  const closeButton = localize('close', 'Close');
  const dontShowAgain = localize('dontShowAgain', "Don't show again");
  const message = localize('managedIdentityAuthAvailable', 'Managed identity authentication for local workflows is now supported.');

  const selection = await vscode.window.showInformationMessage(message, enableButton, closeButton, dontShowAgain);

  if (selection === enableButton) {
    await updateGlobalSetting(enableManagedIdentityAuthSetting, true);
    await updateLocalSettingsForAllProjects(context);
    ext.outputChannel.appendLog(
      localize('managedIdentityAuthEnabled', 'Managed identity authentication has been enabled for local workflows.')
    );
  } else if (selection === dontShowAgain) {
    await ext.context.globalState.update(suppressManagedIdentityAuthNotification, true);
  }
}

/**
 * Iterates over all workspace folders and adds/updates `WORKFLOWS_AUTHENTICATION_METHOD` to
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

  for (const folder of folders) {
    try {
      const projectPath = await tryGetLogicAppProjectRoot(context, folder);
      if (projectPath) {
        await addOrUpdateLocalAppSettings(context, projectPath, miSettings);

        const designTimePath = path.join(projectPath, designTimeDirectoryName);
        if (await fse.pathExists(designTimePath)) {
          await addOrUpdateLocalAppSettings(context, designTimePath, miSettings, true);
        }
      }
    } catch (error) {
      ext.outputChannel.appendLog(
        `Failed to update ${localSettingsFileName} in ${folder.uri.fsPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
