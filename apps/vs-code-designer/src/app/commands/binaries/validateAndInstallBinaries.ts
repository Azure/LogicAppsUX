/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getDependencyTimeout } from '../../utils/binaries';
import { getDependenciesVersion, ensureExtensionBundleHealthy } from '../../utils/bundleFeed';
import { recordDependencyUpdateCheck, shouldCheckForDependencyUpdates } from '../../state/dependencies';
import { setDotNetCommand } from '../../utils/dotnet/dotnet';
import { setFunctionsCommand } from '../../utils/funcCoreTools/funcVersion';
import { installLSPSDK } from '../../utils/languageServerProtocol';
import { setNodeJsCommand } from '../../utils/nodeJs/nodeJsVersion';
import { ensureRuntimeDependenciesPath } from '../../utils/runtimeDependenciesPath';
import { shouldRequireStrictDependencyValidation } from '../../utils/strictDependencyValidation';
import { callWithDurationTelemetry } from '../../utils/telemetry';
import { runWithTimeout } from '../../utils/timeout';
import { validateDotNetIsLatest } from '../dotnet/validateDotNetIsLatest';
import { validateFuncCoreToolsIsLatest } from '../funcCoreTools/validateFuncCoreToolsIsLatest';
import { validateNodeJsIsLatest } from '../nodeJs/validateNodeJsIsLatest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IBundleDependencyFeed } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import { extensionCommand } from '../../../constants';

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
        // Run ensure dependency tasks concurrently
        const ensureDependencyTasks: Promise<void>[] = [
          callWithDurationTelemetry(extensionCommand.ensureNodeJs, async (actionContext: IActionContext) => {
            progress.report({ increment: 20, message: 'NodeJS' });
            await runWithTimeout(
              () => validateNodeJsIsLatest(actionContext, dependenciesVersions?.nodejs),
              'NodeJs',
              dependencyTimeout,
              'https://github.com/nodesource/distributions'
            );
            await setNodeJsCommand();
          }),
          callWithDurationTelemetry(extensionCommand.ensureFuncCoreTools, async (actionContext: IActionContext) => {
            progress.report({ increment: 20, message: 'Functions Runtime' });
            await runWithTimeout(
              () => validateFuncCoreToolsIsLatest(actionContext, dependenciesVersions?.funcCoreTools),
              'Functions Runtime',
              dependencyTimeout,
              'https://github.com/Azure/azure-functions-core-tools/releases'
            );
            await setFunctionsCommand();
          }),
          callWithDurationTelemetry(extensionCommand.ensureDotnet, async (actionContext: IActionContext) => {
            progress.report({ increment: 10, message: '.NET SDK' });
            const dotnetDependencies = dependenciesVersions?.dotnetVersions ?? dependenciesVersions?.dotnet;
            await runWithTimeout(
              () => validateDotNetIsLatest(actionContext, dotnetDependencies),
              '.NET SDK',
              dependencyTimeout,
              'https://dotnet.microsoft.com/en-us/download/dotnet'
            );
            await setDotNetCommand();
          }),
          callWithDurationTelemetry(extensionCommand.ensureSdkLanguageServer, async (_actionContext: IActionContext) => {
            progress.report({ increment: 10, message: 'SDK LSP Server' });
            await runWithTimeout(
              () => installLSPSDK(),
              'SDK LSP Server',
              dependencyTimeout
            );
            // TODO(aeldridge): Why is setDotNetCommand called here?
            await setDotNetCommand();
          }),
        ];

        const results = await Promise.allSettled(ensureDependencyTasks);
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
