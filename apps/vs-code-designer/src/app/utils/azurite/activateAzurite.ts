/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  autoStartAzuriteSetting,
  azuriteBinariesLocationSetting,
  azuriteExtensionPrefix,
  azuriteLocationSetting,
  defaultAzuritePathValue,
  extensionCommand,
  showAutoStartAzuriteWarning,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeOnAzurite } from '../../azuriteExtension/executeOnAzuriteExt';
import { isAzuriteExtensionTerminalError } from '../../azuriteExtension/azuriteErrors';
import { validateEmulatorIsRunning } from '../../debug/validatePreDebug';
import { getAzureWebJobsStorage } from '../appSettings/localSettings';
import { delay } from '../delay';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
import { getWorkspaceSetting, updateGlobalSetting, removeSharedSetting } from '../vsCodeConfig/settings';
import { getWorkspaceFolder } from '../workspace';
import { DialogResponses, parseError, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import type { MessageItem } from 'vscode';

/**
 * Bounded readiness contract for Azurite auto-start, exported so tests assert the
 * real numbers rather than hand-copied literals.
 *
 * The per-probe bound lives in `validatePreDebug` as `azuriteProbeTimeoutMs`; it is
 * load-bearing, because without it a listener that accepts the connection but never
 * responds would stall a single probe forever and re-open the exact hang this module
 * exists to prevent. The retry/delay pair alone only bounds the sleeping.
 */
export const azuriteStartupRetryCount = 10;
export const azuriteStartupRetryDelayMs = 500;

/**
 * Prompts user to set azurite.location and Start Azurite.
 * If azurite extension location was not set:
 * Overrides default Azurite location to new default location.
 * User can specify location.
 */
export async function activateAzurite(context: IActionContext, projectPath?: string): Promise<void> {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    if (!projectPath) {
      const workspaceFolder = await getWorkspaceFolder(context, undefined, true);
      projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
    }

    if (projectPath) {
      const globalAzuriteLocationSetting: string = getWorkspaceSetting<string>(azuriteLocationSetting, projectPath, azuriteExtensionPrefix);
      context.telemetry.properties.globalAzuriteLocation = globalAzuriteLocationSetting;

      // Mutable because the prompts below can persist a new value. The start block further down
      // derives `azurite.location` from this, so it has to keep mirroring what was actually
      // written -- reading a stale copy would silently discard the directory the user just typed.
      let azuriteLocationExtSetting: string = getWorkspaceSetting<string>(azuriteBinariesLocationSetting);

      const showAutoStartAzuriteWarningSetting = !!getWorkspaceSetting<boolean>(showAutoStartAzuriteWarning);

      let autoStartAzurite = !!getWorkspaceSetting<boolean>(autoStartAzuriteSetting);
      context.telemetry.properties.autoStartAzurite = `${autoStartAzurite}`;

      if (showAutoStartAzuriteWarningSetting) {
        const enableMessage: MessageItem = { title: localize('enableAutoStart', 'Enable AutoStart') };

        const result = await context.ui.showWarningMessage(
          localize('autoStartAzuriteTitle', 'Configure Azurite to autostart on project debug?'),
          enableMessage,
          DialogResponses.no,
          DialogResponses.dontWarnAgain
        );

        if (result === DialogResponses.dontWarnAgain) {
          await updateGlobalSetting(showAutoStartAzuriteWarning, false);
        } else if (result === enableMessage) {
          await updateGlobalSetting(showAutoStartAzuriteWarning, false);
          await updateGlobalSetting(autoStartAzuriteSetting, true);
          autoStartAzurite = true;
          context.telemetry.properties.autoStartAzurite = 'true';

          // User has not configured workspace azurite.location.
          if (!azuriteLocationExtSetting) {
            const azuriteDir = await context.ui.showInputBox({
              placeHolder: localize('configureAzuriteLocation', 'Azurite Location'),
              prompt: localize('configureWebhookEndpointPrompt', 'Configure Azurite Workspace location folder path'),
              value: defaultAzuritePathValue,
            });

            if (azuriteDir) {
              await updateGlobalSetting(azuriteBinariesLocationSetting, azuriteDir);
              azuriteLocationExtSetting = azuriteDir;
            } else {
              await updateGlobalSetting(azuriteBinariesLocationSetting, defaultAzuritePathValue);
              azuriteLocationExtSetting = defaultAzuritePathValue;
            }
          }
        }
      } else if (autoStartAzurite && !azuriteLocationExtSetting) {
        await updateGlobalSetting(azuriteBinariesLocationSetting, defaultAzuritePathValue);
        azuriteLocationExtSetting = defaultAzuritePathValue;
        ext.outputChannel.appendLog(localize('autoAzuriteLocation', `Azurite is setup to auto start at ${defaultAzuritePathValue}`));
      }

      const azureWebJobsStorage = await getAzureWebJobsStorage(context, projectPath);
      const isAzuriteRunning = await validateEmulatorIsRunning(context, projectPath, {
        promptWarningMessage: false,
        azureWebJobsStorage,
      });

      if (autoStartAzurite && !isAzuriteRunning) {
        // Use the configured location, or default to the global default path
        const azuriteLocation = azuriteLocationExtSetting || defaultAzuritePathValue;
        // azurite.location is a machine-local absolute path, so write it to the user's global
        // settings instead of the shared .code-workspace file (which is committed to the repo).
        await updateGlobalSetting(azuriteLocationSetting, azuriteLocation, azuriteExtensionPrefix);
        await removeSharedSetting(azuriteLocationSetting, azuriteExtensionPrefix);
        let terminalStartError: Error | undefined;
        try {
          await executeOnAzurite(context, extensionCommand.azureAzuriteStart);
          context.telemetry.properties.azuriteStart = 'true';
        } catch (error) {
          // A rejection here is NOT authoritative. The third-party Azurite extension
          // rejects `azurite.start` when the port is already bound, which is exactly
          // what happens when a healthy Azurite is already serving another debug
          // session. Treating that as fatal would break concurrent projects, so the
          // readiness probe below stays the single source of truth.
          if (isAzuriteExtensionTerminalError(error)) {
            // ...but a missing or unactivatable extension cannot be fixed by waiting. The probe
            // still gets its full budget, because Azurite may be running outside VS Code (Docker,
            // `npm -g azurite`) with the extension merely disabled. Retain the cause so that IF the
            // probe never succeeds the user reads why, instead of a generic "is it installed?".
            terminalStartError = error;
            context.telemetry.properties.azuriteStartTerminalError = 'true';
          }
          context.telemetry.properties.azuriteStart = 'false';
          context.telemetry.properties.azuriteStartError = parseError(error).message;
          ext.outputChannel.appendLog(
            localize(
              'azuriteStartFailed',
              'Could not start Azurite via the Azurite extension ({0}). Checking whether it is already running.',
              parseError(error).message
            )
          );
        }
        context.telemetry.properties.azuriteLocation = azuriteLocation;
        await waitForAzuriteReady(context, projectPath, azureWebJobsStorage, terminalStartError);
      }
    }
  }
}

async function waitForAzuriteReady(
  context: IActionContext,
  projectPath: string,
  azureWebJobsStorage: string | undefined,
  terminalStartError?: Error
): Promise<void> {
  const startedAt = Date.now();
  for (let attempt = 1; attempt <= azuriteStartupRetryCount; attempt++) {
    context.telemetry.properties.azuriteStartupAttempt = attempt.toString();
    if (
      await validateEmulatorIsRunning(context, projectPath, {
        promptWarningMessage: false,
        azureWebJobsStorage,
      })
    ) {
      context.telemetry.properties.azuriteReady = 'true';
      return;
    }

    if (attempt < azuriteStartupRetryCount) {
      await delay(azuriteStartupRetryDelayMs);
    }
  }

  context.telemetry.properties.azuriteReady = 'false';
  // Report measured elapsed time rather than count * delay: each probe is itself
  // bounded by azuriteProbeTimeoutMs, so the sleep budget alone would understate
  // how long the user actually waited.
  const elapsedSeconds = Math.round((Date.now() - startedAt) / 100) / 10;
  if (terminalStartError) {
    // The probe was still given its whole budget, so an externally managed Azurite would have been
    // found by now. Since it was not, the extension failure IS the actionable cause; report it
    // rather than asking the user to check something we already know is broken.
    throw new Error(
      localize(
        'azuriteFailedToStartWithCause',
        'Azurite did not become ready within "{0}" seconds. {1}',
        elapsedSeconds,
        terminalStartError.message
      )
    );
  }
  throw new Error(
    localize(
      'azuriteFailedToStart',
      'Azurite did not become ready within "{0}" seconds. Make sure the Azurite extension is installed and running, then try debugging again.',
      elapsedSeconds
    )
  );
}
