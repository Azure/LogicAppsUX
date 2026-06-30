/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getDependencyTimeout } from '../../utils/binaries';
import { getDependenciesVersion, ensureExtensionBundleHealthy } from '../../utils/bundleFeed';
import { setDotNetCommand } from '../../utils/dotnet/dotnet';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { setFunctionsCommand } from '../../utils/funcCoreTools/funcVersion';
import { installLSPServer } from '../../utils/languageServerProtocol';
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
        executeCommand(ext.outputChannel, undefined, 'echo', 'validateAndInstallBinaries was canceled');
      });

      context.telemetry.properties.lastStep = 'getGlobalSetting';
      progress.report({ increment: 10, message: 'Get Settings' });

      const dependencyTimeout = getDependencyTimeout() * 1000;

      context.telemetry.properties.dependencyTimeout = `${dependencyTimeout} milliseconds`;
      context.telemetry.properties.dependencyPath = await ensureRuntimeDependenciesPath();

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

      context.telemetry.properties.lastStep = 'validateNodeJsIsLatest';

      try {
        await runWithDurationTelemetry(context, 'azureLogicAppsStandard.validateNodeJsIsLatest', async () => {
          progress.report({ increment: 20, message: 'NodeJS' });
          await timeout(
            validateNodeJsIsLatest,
            'NodeJs',
            dependencyTimeout,
            'https://github.com/nodesource/distributions',
            dependenciesVersions?.nodejs
          );
          await setNodeJsCommand();
        });

        context.telemetry.properties.lastStep = 'validateFuncCoreToolsIsLatest';
        await runWithDurationTelemetry(context, 'azureLogicAppsStandard.validateFuncCoreToolsIsLatest', async () => {
          progress.report({ increment: 20, message: 'Functions Runtime' });
          await timeout(
            validateFuncCoreToolsIsLatest,
            'Functions Runtime',
            dependencyTimeout,
            'https://github.com/Azure/azure-functions-core-tools/releases',
            dependenciesVersions?.funcCoreTools
          );
          await setFunctionsCommand();
        });

        context.telemetry.properties.lastStep = 'validateDotNetIsLatest';
        await runWithDurationTelemetry(context, 'azureLogicAppsStandard.validateDotNetIsLatest', async () => {
          progress.report({ increment: 10, message: '.NET SDK' });
          const dotnetDependencies = dependenciesVersions?.dotnetVersions ?? dependenciesVersions?.dotnet;
          await timeout(
            validateDotNetIsLatest,
            '.NET SDK',
            dependencyTimeout,
            'https://dotnet.microsoft.com/en-us/download/dotnet',
            dotnetDependencies
          );
          await setDotNetCommand();
        });

        context.telemetry.properties.lastStep = 'installLSPServer';
        await runWithDurationTelemetry(context, 'azureLogicAppsStandard.installLSPServer', async () => {
          progress.report({ increment: 10, message: 'LSP Server' });
          await timeout(installLSPServer, 'LSP Server', dependencyTimeout);
          await setDotNetCommand();
        });

        // Block validation success on a healthy extension bundle. The bundle
        // download is fired-and-forgotten from activation so the UI stays
        // responsive, but validation is the right place to surface a failed
        // install: without a healthy bundle, the design-time host and any
        // workflow runtime will be broken, and we'd rather fail loudly here
        // than let func.exe spawn against a missing/corrupt bundle.
        context.telemetry.properties.lastStep = 'ensureExtensionBundleHealthy';
        progress.report({ increment: 5, message: 'Extension Bundle' });
        await ensureExtensionBundleHealthy(context, { requireInstalled: requireStrictDependencyValidation });

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
