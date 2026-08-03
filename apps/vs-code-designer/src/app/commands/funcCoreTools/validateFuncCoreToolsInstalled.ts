/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { type PackageManager, funcVersionSetting, validateFuncCoreToolsSetting } from '../../../constants';
import { localize } from '../../../localize';
import { useBinariesDependencies } from '../../utils/binaries';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import {
  ensureFuncCoreToolsCommandExecutablePermissions,
  getFunctionsCommand,
  tryParseFuncVersion,
} from '../../utils/funcCoreTools/funcVersion';
import { getFuncPackageManagers } from '../../utils/funcCoreTools/getFuncPackageManagers';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import {
  installFuncCoreToolsBinaries,
  installFuncCoreToolsSystem,
  isFuncCoreToolsInstallInFlight,
  waitForFuncCoreToolsInstall,
} from './installFuncCoreTools';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { FuncVersion } from '@microsoft/vscode-extension-logic-apps';
import type { MessageItem } from 'vscode';
import { ext } from '../../../extensionVariables';

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
    } else if (await useBinariesDependencies()) {
      // The managed func binaries may exist on disk but fail to execute (partial extract,
      // poisoned runtime-deps cache, or a reinstall that hasn't finished). Before dead-ending
      // on the interactive "Install" modal — which cannot be answered headlessly and blocks
      // debug — attempt a silent reinstall of the managed binaries and re-verify. This lets a
      // provisioned-but-unrunnable func self-heal instead of aborting F5.
      if (await attemptManagedFuncCoreToolsRepair(innerContext)) {
        installed = true;
      } else {
        installed = await validateFuncCoreToolsInstalledBinaries(innerContext, message, install, input, installed);
      }
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

/**
 * Check is functions core tools is installed.
 * @returns {Promise<boolean>} Returns true if installed, otherwise returns false.
 */
async function isFuncToolsInstalled(): Promise<boolean> {
  const funcCommand = getFunctionsCommand();
  if (!ensureFuncCoreToolsCommandExecutablePermissions(funcCommand)) {
    return false;
  }

  try {
    await executeCommand(undefined, undefined, funcCommand, '--version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Silently reinstalls the managed (auto-provisioned) Azure Functions Core Tools binaries and
 * re-verifies that `func --version` runs. Used to self-heal a func that exists on disk but
 * fails to execute (partial extract / poisoned cache / interrupted install) so we don't
 * dead-end on the interactive install modal that cannot be answered headlessly.
 * @param {IActionContext} context - Command context.
 * @returns {Promise<boolean>} True when the repair produced a runnable func, false otherwise.
 */
async function attemptManagedFuncCoreToolsRepair(context: IActionContext): Promise<boolean> {
  context.telemetry.properties.funcRepairAttempted = 'true';
  // This repair runs silently in the middle of F5. Without a trace in the output channel a failure here
  // is indistinguishable from the gate never running at all, both for users reporting "debug does
  // nothing" and for anyone reading a CI log.
  ext.outputChannel.appendLog('Functions Core Tools did not run; attempting a silent repair of the managed binaries.');
  try {
    if (isFuncCoreToolsInstallInFlight()) {
      // Another code path — typically the activation-time version check — is already writing to the
      // shared runtime-dependencies folder, which is also the reason `func --version` is failing right
      // now. Starting a second install would delete and re-extract that folder underneath the first
      // one, so wait for it to settle and re-probe instead.
      context.telemetry.properties.funcRepairAwaitedExistingInstall = 'true';
      ext.outputChannel.appendLog('An install is already in progress; waiting for it to finish instead of starting another.');
      await waitForFuncCoreToolsInstall();
    } else {
      await installFuncCoreToolsBinaries(context, undefined, { suppressUi: true });
    }
    const repaired = await isFuncToolsInstalled();
    context.telemetry.properties.funcRepairSucceeded = `${repaired}`;
    ext.outputChannel.appendLog(
      repaired
        ? 'Functions Core Tools repair succeeded; continuing to debug.'
        : 'Functions Core Tools repair completed but "func --version" still fails.'
    );
    return repaired;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.telemetry.properties.funcRepairSucceeded = 'false';
    context.telemetry.properties.funcRepairError = message;
    ext.outputChannel.appendLog(`Functions Core Tools repair failed: ${message}`);
    return false;
  }
}

async function validateFuncCoreToolsInstalledBinaries(
  innerContext: IActionContext,
  message: string,
  install: MessageItem,
  input: MessageItem | undefined,
  installed: boolean
): Promise<boolean> {
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
}

async function validateFuncCoreToolsInstalledSystem(
  innerContext: IActionContext,
  message: string,
  install: MessageItem,
  input: MessageItem | undefined,
  installed: boolean,
  fsPath: string
): Promise<boolean> {
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
}
