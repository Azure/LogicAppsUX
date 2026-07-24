/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getDependencyTimeout } from '../../utils/binaries';
import { getDependenciesVersion, ensureExtensionBundleHealthy } from '../../utils/bundleFeed';
import { recordDependencyUpdateCheck, shouldCheckForDependencyUpdates } from '../../utils/dependencyUpdateCheck';
import { setDotNetCommand } from '../../utils/dotnet/dotnet';
import { setFunctionsCommand } from '../../utils/funcCoreTools/funcVersion';
import { installLSPSDK } from '../../utils/languageServerProtocol';
import { setNodeJsCommand } from '../../utils/nodeJs/nodeJsVersion';
import { ensureRuntimeDependenciesPath } from '../../utils/runtimeDependenciesPath';
import { shouldRequireStrictDependencyValidation } from '../../utils/strictDependencyValidation';
import { runWithDurationTelemetry } from '../../utils/telemetry';
import { timeout } from '../../utils/timeout';
import { validateDotNetIsLatest } from '../dotnet/validateDotNetIsLatest';
import { validateFuncCoreToolsIsLatest } from '../funcCoreTools/validateFuncCoreToolsIsLatest';
import { validateNodeJsIsLatest } from '../nodeJs/validateNodeJsIsLatest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IBundleDependencyFeed } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';

/**
 * Lightweight output-channel timing breadcrumb for the dependency-validation
 * phase, mirroring bundleFeed's `[bundle-timing]` logs. The four validators run
 * concurrently via `Promise.allSettled`, so a slow launch previously gave no
 * signal about WHICH task (or sub-step) consumed the time — three print version
 * lines but `.NET` and `installLSPSDK` did not surface a clear completion. These
 * lines are cheap (a `Date.now()` + string) and only fire during validation, so
 * they can stay as a permanent diagnostic breadcrumb. Pass the previous marker's
 * return value as `sinceMs` to log the elapsed delta for that phase.
 */
function logDepStep(label: string, sinceMs?: number): number {
  const now = Date.now();
  const delta = sinceMs === undefined ? '' : ` (+${now - sinceMs}ms)`;
  ext.outputChannel?.appendLog(`[dep-timing] ${label}${delta}`);
  return now;
}

export async function validateAndInstallBinaries(context: IActionContext) {
  const helpLink = 'https://aka.ms/lastandard/onboarding/troubleshoot';
  const requireStrictDependencyValidation = shouldRequireStrictDependencyValidation();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: localize('validateRuntimeDependency', 'Validating Runtime Dependency'),
      cancellable: false, // Allow the user to cancel the task
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        // Handle cancellation logic
        ext.outputChannel.appendLog('validateAndInstallBinaries was canceled');
      });

      context.telemetry.properties.lastStep = 'getGlobalSetting';
      progress.report({ increment: 10, message: 'Get Settings' });

      const dependencyTimeout = getDependencyTimeout() * 1000;

      context.telemetry.properties.dependencyTimeout = `${dependencyTimeout} milliseconds`;
      context.telemetry.properties.dependencyPath = await ensureRuntimeDependenciesPath();

      // Decide once, up front, whether this pass should perform the network "is there a newer
      // version?" checks. Individual validators read the same throttle flag, so they stay in sync
      // for the duration of this run (the timestamp is only advanced after a successful pass).
      const performedUpdateCheck = shouldCheckForDependencyUpdates();
      context.telemetry.properties.performedDependencyUpdateCheck = `${performedUpdateCheck}`;

      context.telemetry.properties.lastStep = 'getDependenciesVersion';
      progress.report({ increment: 10, message: 'Get dependency version from CDN' });
      let dependenciesVersions: IBundleDependencyFeed;
      try {
        dependenciesVersions = await getDependenciesVersion(context);
        context.telemetry.properties.dependenciesVersions = JSON.stringify(dependenciesVersions);
      } catch (error) {
        // Unable to get dependency.json, will default to fallback versions
        console.log(error);
      }

      context.telemetry.properties.lastStep = 'validateDependencies';

      try {
        // The four dependency validations are independent of one another, so run them
        // concurrently instead of sequentially to reduce startup time.
        const validationTasks: Promise<void>[] = [
          runWithDurationTelemetry(context, 'azureLogicAppsStandard.validateNodeJsIsLatest', async () => {
            const step = logDepStep('validateNodeJsIsLatest START');
            progress.report({ increment: 20, message: 'NodeJS' });
            await timeout(
              validateNodeJsIsLatest,
              'NodeJs',
              dependencyTimeout,
              'https://github.com/nodesource/distributions',
              dependenciesVersions?.nodejs
            );
            await setNodeJsCommand();
            logDepStep('validateNodeJsIsLatest END', step);
          }),
          runWithDurationTelemetry(context, 'azureLogicAppsStandard.validateFuncCoreToolsIsLatest', async () => {
            const step = logDepStep('validateFuncCoreToolsIsLatest START');
            progress.report({ increment: 20, message: 'Functions Runtime' });
            await timeout(
              validateFuncCoreToolsIsLatest,
              'Functions Runtime',
              dependencyTimeout,
              'https://github.com/Azure/azure-functions-core-tools/releases',
              dependenciesVersions?.funcCoreTools
            );
            await setFunctionsCommand();
            logDepStep('validateFuncCoreToolsIsLatest END', step);
          }),
          runWithDurationTelemetry(context, 'azureLogicAppsStandard.validateDotNetIsLatest', async () => {
            const step = logDepStep('validateDotNetIsLatest START');
            progress.report({ increment: 10, message: '.NET SDK' });
            const dotnetDependencies = dependenciesVersions?.dotnetVersions ?? dependenciesVersions?.dotnet;
            await timeout(
              validateDotNetIsLatest,
              '.NET SDK',
              dependencyTimeout,
              'https://dotnet.microsoft.com/en-us/download/dotnet',
              dotnetDependencies
            );
            const setStep = logDepStep('validateDotNetIsLatest validate done; setDotNetCommand START', step);
            await setDotNetCommand();
            logDepStep('validateDotNetIsLatest END (setDotNetCommand done)', setStep);
          }),
          runWithDurationTelemetry(context, 'azureLogicAppsStandard.installLSPSDK', async () => {
            const step = logDepStep('installLSPSDK START');
            progress.report({ increment: 10, message: 'LSP SDK' });
            await timeout(installLSPSDK, 'LSP SDK', dependencyTimeout);
            const setStep = logDepStep('installLSPSDK install done; setDotNetCommand START', step);
            await setDotNetCommand();
            logDepStep('installLSPSDK END (setDotNetCommand done)', setStep);
          }),
        ];

        const allSettledStart = logDepStep('Promise.allSettled(validationTasks) START');
        const results = await Promise.allSettled(validationTasks);
        logDepStep('Promise.allSettled(validationTasks) END', allSettledStart);
        const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
        if (failure) {
          throw failure.reason;
        }

        // Block validation success on a healthy extension bundle. The bundle
        // download is fired-and-forgotten from activation so the UI stays
        // responsive, but validation is the right place to surface a failed
        // install: without a healthy bundle, the design-time host and any
        // workflow runtime will be broken, and we'd rather fail loudly here
        // than let func.exe spawn against a missing/corrupt bundle.
        context.telemetry.properties.lastStep = 'ensureExtensionBundleHealthy';
        progress.report({ increment: 5, message: 'Extension Bundle' });
        await ensureExtensionBundleHealthy(context, { requireInstalled: requireStrictDependencyValidation });

        // Only advance the throttle window when we actually performed the update checks and the
        // whole pass succeeded, so a failed or skipped run still retries on the next activation.
        if (performedUpdateCheck) {
          await recordDependencyUpdateCheck();
        }

        ext.outputChannel.appendLog(
          localize(
            'azureLogicApsBinariesSucessfull',
            'Azure Logic Apps Standard Runtime Dependencies validation and installation completed successfully.'
          )
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        ext.outputChannel.appendLog(
          localize('azureLogicApsBinariesError', 'Error in dependencies validation and installation: "{0}"...', errorMessage)
        );
        context.telemetry.properties.dependenciesError = errorMessage;
        vscode.window.showErrorMessage(
          localize(
            'binariesTroubleshoot',
            `The Validation and Installation of Runtime Dependencies encountered an error. To resolve this issue, please click [here](${helpLink}) to access our troubleshooting documentation for step-by-step instructions.`
          )
        );
        if (requireStrictDependencyValidation) {
          throw error;
        }
      }
    }
  );
}
