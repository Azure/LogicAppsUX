/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { type PackageManager, funcVersionSetting, validateFuncCoreToolsSetting } from '../../../constants';
import { localize } from '../../../localize';
import { useBinariesDependencies } from '../../utils/binaries';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getFunctionsCommand, tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getFuncPackageManagers } from '../../utils/funcCoreTools/getFuncPackageManagers';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { installFuncCoreToolsBinaries, installFuncCoreToolsSystem } from './installFuncCoreTools';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { FuncVersion } from '@microsoft/vscode-extension-logic-apps';
import type { MessageItem } from 'vscode';

/**
 * Checks if functions core tools is installed, and installs it if needed.
 * @param {IActionContext} context - Workflow file path.
 * @param {string} message - Message for warning.
 * @param {string} fsPath - Workspace file system path.
 * @returns {Promise<boolean>} Returns true if it is installed or was sucessfully installed, otherwise returns false.
 */
export async function validateFuncCoreToolsInstalled(context: IActionContext, message: string, fsPath: string): Promise<boolean> {
  let input: MessageItem | undefined;
  let installed = false;
  const install: MessageItem = { title: localize('install', 'Install') };

  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateFuncCoreToolsInstalled', async (innerContext: IActionContext) => {
    innerContext.errorHandling.suppressDisplay = true;

    if (!getWorkspaceSetting<boolean>(validateFuncCoreToolsSetting, fsPath)) {
      innerContext.telemetry.properties.validateFuncCoreTools = 'false';
      installed = true;
    } else if (await isFuncToolsInstalled()) {
      installed = true;
    } else if (useBinariesDependencies()) {
      installed = await validateFuncCoreToolsInstalledBinaries(innerContext, message, install, input, installed);
    } else {
      installed = await validateFuncCoreToolsInstalledSystem(innerContext, message, install, input, installed, fsPath);
    }
  });

  // validate that Func Tools was installed only if user confirmed
  if (input === install && !installed) {
    if (
      (await context.ui.showWarningMessage(
        localize('failedInstallFuncTools', 'The Azure Functions Core Tools installion has failed and will have to be installed manually.'),
        DialogResponses.learnMore
      )) === DialogResponses.learnMore
    ) {
      await openUrl('https://aka.ms/Dqur4e');
    }
  }

  return installed;
}

const validateFuncCoreToolsInstalledBinaries = async (
  innerContext: IActionContext,
  message: string,
  install: MessageItem,
  input: MessageItem | undefined,
  installed: boolean
) => {
  const items: MessageItem[] = [install, DialogResponses.learnMore];
  input = await innerContext.ui.showWarningMessage(message, { modal: true }, ...items);
  innerContext.telemetry.properties.dialogResult = input.title;

  if (input === install) {
    await installFuncCoreToolsBinaries(innerContext);
    installed = true;
  } else if (input === DialogResponses.learnMore) {
    await openUrl('https://aka.ms/Dqur4e');
  }

  return installed;
};

const validateFuncCoreToolsInstalledSystem = async (
  innerContext: IActionContext,
  message: string,
  install: MessageItem,
  input: MessageItem | undefined,
  installed: boolean,
  fsPath: string
) => {
  const items: MessageItem[] = [];
  const packageManagers: PackageManager[] = await getFuncPackageManagers(false /* isFuncInstalled */);
  if (packageManagers.length > 0) {
    items.push(install);
  } else {
    items.push(DialogResponses.learnMore);
  }

  input = await innerContext.ui.showWarningMessage(message, { modal: true }, ...items);

  innerContext.telemetry.properties.dialogResult = input.title;

  if (input === install) {
    const version: FuncVersion | undefined = tryParseFuncVersion(getWorkspaceSetting(funcVersionSetting, fsPath));
    await installFuncCoreToolsSystem(innerContext, packageManagers, version);
    installed = true;
  } else if (input === DialogResponses.learnMore) {
    await openUrl('https://aka.ms/Dqur4e');
  }
  return installed;
};

/**
 * Check is functions core tools is installed.
 * @returns {Promise<boolean>} Returns true if installed, otherwise returns false.
 */
export async function isFuncToolsInstalled(): Promise<boolean> {
  const funcCommand = getFunctionsCommand();
  try {
    await executeCommand(undefined, undefined, funcCommand, '--version');
    return true;
  } catch (error) {
    return false;
  }
}
