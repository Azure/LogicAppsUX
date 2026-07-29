/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  autoStartAzuriteSetting,
  projectLanguageSetting,
  workerRuntimeKey,
  localEmulatorConnectionString,
  azureWebJobsStorageKey,
  localSettingsFileName,
  inlineCodeNodeExecutablePathKey,
} from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { validateFuncCoreToolsInstalled } from '../commands/funcCoreTools/validateFuncCoreToolsInstalled';
import { getAzureWebJobsStorage, setLocalAppSetting } from '../utils/appSettings/localSettings';
import { getNodeJsCommand } from '../utils/nodeJs/nodeJsVersion';
import { getDebugConfigs, isDebugConfigEqual } from '../utils/vsCodeConfig/launch';
import { getWorkspaceSetting, getFunctionsWorkerRuntime } from '../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { parseError } from '@microsoft/vscode-azext-utils';
import { MismatchBehavior, Platform } from '@microsoft/vscode-extension-logic-apps';
import * as azureStorage from 'azure-storage';
import * as path from 'path';
import * as vscode from 'vscode';

export interface ValidateEmulatorOptions {
  promptWarningMessage?: boolean;
  allowDebugAnyway?: boolean;
  azureWebJobsStorage?: string | undefined;
}

/**
 * Hard upper bound on a single emulator probe.
 *
 * Declared here rather than alongside the retry constants in `activateAzurite`
 * because that module already imports from this one; importing back would create
 * a cycle.
 */
export const azuriteProbeTimeoutMs = 2000;

/**
 * Validates functions core tools is installed and azure emulator is running
 * @param {IActionContext} context - Command context.
 * @param {string} projectPath - The logic app project path.
 * @returns {boolean} Flag to determine if debug should continue.
 */
export async function preDebugValidate(context: IActionContext, projectPath: string): Promise<boolean> {
  let shouldContinue: boolean;

  try {
    context.telemetry.properties.lastValidateStep = 'funcInstalled';
    const message: string = localize(
      'installFuncTools',
      'You must have the Azure Functions Core Tools installed to debug your local functions.'
    );
    shouldContinue = await validateFuncCoreToolsInstalled(context, message, projectPath);

    if (shouldContinue) {
      const projectLanguage: string | undefined = getWorkspaceSetting(projectLanguageSetting, projectPath);
      context.telemetry.properties.projectLanguage = projectLanguage;

      context.telemetry.properties.lastValidateStep = 'workerRuntime';
      await validateWorkerRuntime(context, projectLanguage, projectPath);

      context.telemetry.properties.lastValidateStep = 'inlineCodeNodePath';
      await validateInlineCodeNodePath(context, projectPath);

      context.telemetry.properties.lastValidateStep = 'emulatorRunning';
      const azureWebJobsStorage: string | undefined = await getAzureWebJobsStorage(context, projectPath);
      if (azureWebJobsStorage?.trim()) {
        const autoStartAzurite = !!getWorkspaceSetting<boolean>(autoStartAzuriteSetting);
        shouldContinue = await validateEmulatorIsRunning(context, projectPath, {
          allowDebugAnyway: !autoStartAzurite,
          azureWebJobsStorage,
        });
      } else {
        shouldContinue = warnMissingAzureWebJobsStorage(context);
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

  return shouldContinue;
}

/**
 * Gets the workspace folder that matches the debug configuration.
 * @param {vscode.DebugConfiguration} debugConfig - Debug configuration to match.
 * @returns {vscode.WorkspaceFolder} The workspace folder that matches the debug configuration.
 */
export function getMatchingWorkspaceFolder(debugConfig: vscode.DebugConfiguration): vscode.WorkspaceFolder {
  if (vscode.workspace.workspaceFolders) {
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      try {
        const configs: vscode.DebugConfiguration[] = getDebugConfigs(workspaceFolder);
        if (configs.some((c) => isDebugConfigEqual(c, debugConfig))) {
          return workspaceFolder;
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
 * Automatically adds worker runtime setting since it's required to debug, but often gets deleted since it's stored in "local.settings.json" which isn't tracked in source control
 * @param {IActionContext} context - Command context.
 * @param {string | undefinedn} projectLanguage - Project language.
 * @param {string} projectPath - Project path.
 */
async function validateWorkerRuntime(context: IActionContext, projectLanguage: string | undefined, projectPath: string): Promise<void> {
  const runtime: string | undefined = getFunctionsWorkerRuntime(projectLanguage);
  if (runtime) {
    // Not worth handling mismatched runtimes since it's so unlikely
    await setLocalAppSetting(context, projectPath, workerRuntimeKey, runtime, MismatchBehavior.DontChange);
  }
}

/**
 * Surfaces a missing `AzureWebJobsStorage` connection without blocking the debug path.
 *
 * This runs inside `resolveDebugConfiguration`, where any awaited UI stalls
 * `vscode.debug.startDebugging()` indefinitely — the exact hang this module was
 * changed to eliminate. The notification is therefore fire-and-forget and debug
 * is allowed to continue, matching the behavior before the readiness work: the
 * func host surfaces its own error if the missing connection actually matters.
 */
function warnMissingAzureWebJobsStorage(context: IActionContext): boolean {
  const message: string = localize(
    'missingAzureWebJobsStorage',
    'Missing "{0}" connection in "{1}". Add a storage connection string if this project needs one.',
    azureWebJobsStorageKey,
    localSettingsFileName
  );
  context.telemetry.properties.missingAzureWebJobsStorage = 'true';
  ext.outputChannel.appendLog(message);
  // Fire-and-forget on purpose: this runs inside resolveDebugConfiguration, so
  // awaiting a dialog here would stall startDebugging() indefinitely.
  vscode.window.showWarningMessage(message);
  return true;
}

/**
 * Pins the in-proc8 InlineCodeDependencyGenerator's `node` lookup to the
 * absolute path of the extension-managed (or system) `node` binary, written
 * into `local.settings.json` Values as `languageWorkers__node__defaultExecutablePath`.
 *
 * This is belt-and-braces: the `func: host start` task already sets PATH via
 * platform-keyed `windows`/`linux`/`osx` blocks, but the dep generator runs
 * as a grandchild of the func host and PATH inheritance has been observed
 * to drop on some Linux CI configurations. Setting the absolute path here
 * makes the lookup deterministic regardless of PATH propagation.
 *
 * Uses `MismatchBehavior.DontChange` so users can override the value.
 */
async function validateInlineCodeNodePath(context: IActionContext, projectPath: string): Promise<void> {
  try {
    const nodeCommand = getNodeJsCommand();
    if (!nodeCommand || nodeCommand.trim().length === 0) {
      return;
    }
    // Only pin an absolute path; if `nodeCommand` is a bare command name like
    // "node", the in-proc8 runtime will still resolve via PATH (which we've
    // already corrected in the task definition).
    if (!path.isAbsolute(nodeCommand)) {
      return;
    }
    await setLocalAppSetting(context, projectPath, inlineCodeNodeExecutablePathKey, nodeCommand, MismatchBehavior.DontChange);
  } catch (error) {
    // Best-effort: never block debug if we can't resolve a node path.
    context.telemetry.properties.inlineCodeNodePathError = parseError(error).message;
  }
}

/**
 * If AzureWebJobsStorage is set, pings the emulator to make sure it's actually running
 * @param {IActionContext} context - Command context.
 * @param {string} projectPath - Project path.
 * @param {boolean | ValidateEmulatorOptions} options - Options for prompting and allowing debug continuation.
 * @returns {boolean} Returns true if a valid emulator is running, otherwise returns false.
 */
export async function validateEmulatorIsRunning(
  context: IActionContext,
  projectPath: string,
  options: boolean | ValidateEmulatorOptions = true
): Promise<boolean> {
  const promptWarningMessage = typeof options === 'boolean' ? options : (options.promptWarningMessage ?? true);
  const allowDebugAnyway = typeof options === 'boolean' ? true : (options.allowDebugAnyway ?? true);
  const azureWebJobsStorage: string | undefined =
    typeof options === 'boolean' || !('azureWebJobsStorage' in options)
      ? await getAzureWebJobsStorage(context, projectPath)
      : options.azureWebJobsStorage;

  if (azureWebJobsStorage && azureWebJobsStorage.toLowerCase() === localEmulatorConnectionString.toLowerCase()) {
    try {
      const client: azureStorage.BlobService = azureStorage.createBlobService(azureWebJobsStorage);
      await probeEmulator(client);
    } catch {
      if (!promptWarningMessage) {
        return false;
      }
      const message: string = localize(
        'failedToConnectEmulator',
        'Failed to verify "{0}" connection specified in "{1}". Is the local emulator installed and running?',
        azureWebJobsStorageKey,
        localSettingsFileName
      );

      const learnMoreLink: string = process.platform === Platform.windows ? 'https://aka.ms/AA4ym56' : 'https://aka.ms/AA4yef8';
      if (!allowDebugAnyway) {
        // Deliberately NOT a modal. This runs inside resolveDebugConfiguration, so an
        // awaited dialog stalls startDebugging() forever — the original bug. Throwing
        // surfaces the same text through the non-modal command error notification and
        // aborts the session promptly.
        ext.outputChannel.appendLog(message);
        throw new Error(message);
      }

      const debugAnyway: vscode.MessageItem = { title: localize('debugAnyway', 'Debug anyway') };
      const result: vscode.MessageItem = await context.ui.showWarningMessage(message, { learnMoreLink, modal: true }, debugAnyway);
      return result === debugAnyway;
    }
  }

  return true;
}

/**
 * Probes the emulator with a hard upper bound.
 *
 * `doesContainerExist` has no timeout of its own, so a listener that accepts the
 * TCP connection but never replies (a half-started emulator, or an unrelated
 * process squatting on port 10000) would hang this call indefinitely and, through
 * the readiness loop, hang the whole debug session.
 */
async function probeEmulator(client: azureStorage.BlobService): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Azurite probe timed out after ${azuriteProbeTimeoutMs}ms`));
    }, azuriteProbeTimeoutMs);

    // Checking against a common container for functions, but doesn't really matter what call we make here
    client.doesContainerExist('azure-webjob-hosts', (err: Error | undefined) => {
      clearTimeout(timer);
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
