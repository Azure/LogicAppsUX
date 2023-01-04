/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  projectLanguageSetting,
  workerRuntimeKey,
  localEmulatorConnectionString,
  azureWebJobsStorageKey,
  localSettingsFileName,
} from '../../constants';
import { localize } from '../../localize';
import { getAzureWebJobsStorage, setLocalAppSetting } from '../funcConfig/local.settings';
import { validateFuncCoreToolsInstalled } from '../funcCoreTools/validateFuncCoreToolsInstalled';
import { tryGetFunctionProjectRoot } from '../utils/verifyIsProject';
import { getDebugConfigs, isDebugConfigEqual } from '../utils/vsCodeConfig/launch';
import { getWorkspaceSetting, getFunctionsWorkerRuntime } from '../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { parseError } from '@microsoft/vscode-azext-utils';
import { MismatchBehavior } from '@microsoft/vscode-extension';
import * as azureStorage from 'azure-storage';
import * as vscode from 'vscode';

export interface IPreDebugValidateResult {
  workspace: vscode.WorkspaceFolder;
  shouldContinue: boolean;
}

export async function preDebugValidate(context: IActionContext, debugConfig: vscode.DebugConfiguration): Promise<IPreDebugValidateResult> {
  const workspace: vscode.WorkspaceFolder = getMatchingWorkspace(debugConfig);
  let shouldContinue: boolean;
  context.telemetry.properties.debugType = debugConfig.type;

  try {
    context.telemetry.properties.lastValidateStep = 'funcInstalled';
    const message: string = localize(
      'installFuncTools',
      'You must have the Azure Functions Core Tools installed to debug your local functions.'
    );
    shouldContinue = await validateFuncCoreToolsInstalled(context, message, workspace.uri.fsPath);

    if (shouldContinue) {
      context.telemetry.properties.lastValidateStep = 'getProjectRoot';
      const projectPath: string | undefined = await tryGetFunctionProjectRoot(context, workspace, true /* suppressPrompt */);

      if (projectPath) {
        const projectLanguage: string | undefined = getWorkspaceSetting(projectLanguageSetting, projectPath);
        context.telemetry.properties.projectLanguage = projectLanguage;

        context.telemetry.properties.lastValidateStep = 'workerRuntime';
        await validateWorkerRuntime(context, projectLanguage, projectPath);

        context.telemetry.properties.lastValidateStep = 'emulatorRunning';
        shouldContinue = await validateEmulatorIsRunning(context, projectPath);
      }
    }
  } catch (error) {
    if (parseError(error).isUserCancelledError) {
      shouldContinue = false;
    } else {
      throw error;
    }
  }

  context.telemetry.properties.shouldContinue = String(shouldContinue);

  return { workspace, shouldContinue };
}

function getMatchingWorkspace(debugConfig: vscode.DebugConfiguration): vscode.WorkspaceFolder {
  if (vscode.workspace.workspaceFolders) {
    for (const workspace of vscode.workspace.workspaceFolders) {
      try {
        const configs: vscode.DebugConfiguration[] = getDebugConfigs(workspace);
        if (configs.some((c) => isDebugConfigEqual(c, debugConfig))) {
          return workspace;
        }
      } catch {
        // ignore and try next workspace
      }
    }
  }

  throw new Error(
    localize(
      'noDebug',
      'Failed to find launch config matching name "{0}", request "{1}", and type "{2}".',
      debugConfig.name,
      debugConfig.request,
      debugConfig.type
    )
  );
}

/**
 * Automatically add worker runtime setting since it's required to debug, but often gets deleted since it's stored in "local.settings.json" which isn't tracked in source control
 */
async function validateWorkerRuntime(context: IActionContext, projectLanguage: string | undefined, projectPath: string): Promise<void> {
  const runtime: string | undefined = getFunctionsWorkerRuntime(projectLanguage);
  if (runtime) {
    // Not worth handling mismatched runtimes since it's so unlikely
    await setLocalAppSetting(context, projectPath, workerRuntimeKey, runtime, MismatchBehavior.DontChange);
  }
}

/**
 * If AzureWebJobsStorage is set, pings the emulator to make sure it's actually running
 */
async function validateEmulatorIsRunning(context: IActionContext, projectPath: string): Promise<boolean> {
  const azureWebJobsStorage: string | undefined = await getAzureWebJobsStorage(context, projectPath);
  if (azureWebJobsStorage && azureWebJobsStorage.toLowerCase() === localEmulatorConnectionString.toLowerCase()) {
    try {
      const client: azureStorage.BlobService = azureStorage.createBlobService(azureWebJobsStorage);
      await new Promise<void>((resolve, reject) => {
        // Checking against a common container for functions, but doesn't really matter what call we make here
        client.doesContainerExist('azure-webjob-hosts', (err: Error | undefined) => {
          // tslint:disable-next-line: no-void-expression
          err ? reject(err) : resolve();
        });
      });
    } catch (error) {
      const message: string = localize(
        'failedToConnectEmulator',
        'Failed to verify "{0}" connection specified in "{1}". Is the local emulator installed and running?',
        azureWebJobsStorageKey,
        localSettingsFileName
      );
      const learnMoreLink: string = process.platform === 'win32' ? 'https://aka.ms/AA4ym56' : 'https://aka.ms/AA4yef8';
      const debugAnyway: vscode.MessageItem = { title: localize('debugAnyway', 'Debug anyway') };
      const result: vscode.MessageItem = await context.ui.showWarningMessage(message, { learnMoreLink, modal: true }, debugAnyway);
      return result === debugAnyway;
    }
  }

  return true;
}
