/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { autoRuntimeDependenciesPathSettingKey, defaultDependencyPathValue } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getDependencyTimeout } from '../../utils/binaries';
import { getDependenciesVersion } from '../../utils/bundleFeed';
import { setDotNetCommand } from '../../utils/dotnet/dotnet';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { setFunctionsCommand } from '../../utils/funcCoreTools/funcVersion';
import { setNodeJsCommand } from '../../utils/nodeJs/nodeJsVersion';
import { runWithDurationTelemetry } from '../../utils/telemetry';
import { timeout } from '../../utils/timeout';
import { getGlobalSetting, updateGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { validateDotNetIsLatest } from '../dotnet/validateDotNetIsLatest';
import { validateFuncCoreToolsIsLatest } from '../funcCoreTools/validateFuncCoreToolsIsLatest';
import { validateNodeJsIsLatest } from '../nodeJs/validateNodeJsIsLatest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IBundleDependencyFeed } from '@microsoft/vscode-extension';
import * as vscode from 'vscode';

export async function validateAndInstallBinaries(context: IActionContext) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification, // Location of the progress indicator
      title: 'Validating Runtime Dependency', // Title displayed in the progress notification
      cancellable: false, // Allow the user to cancel the task
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        // Handle cancellation logic
        executeCommand(ext.outputChannel, undefined, 'echo', 'validateAndInstallBinaries was canceled');
      });

      context.telemetry.properties.lastStep = 'getGlobalSetting';
      progress.report({ increment: 10, message: `Get Settings` });

      const dependencyTimeout = (await getDependencyTimeout()) * 1000;

      context.telemetry.properties.dependencyTimeout = `${dependencyTimeout} milliseconds`;
      if (!getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey)) {
        await updateGlobalSetting(autoRuntimeDependenciesPathSettingKey, defaultDependencyPathValue);
        context.telemetry.properties.dependencyPath = defaultDependencyPathValue;
      }

      context.telemetry.properties.lastStep = 'getDependenciesVersion';
      progress.report({ increment: 10, message: `Get dependency version from CDN` });
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
          progress.report({ increment: 20, message: `NodeJS` });
          await timeout(validateNodeJsIsLatest, dependencyTimeout, dependenciesVersions?.nodejs);
          await setNodeJsCommand();
        });

        context.telemetry.properties.lastStep = 'validateFuncCoreToolsIsLatest';
        await runWithDurationTelemetry(context, 'azureLogicAppsStandard.validateFuncCoreToolsIsLatest', async () => {
          progress.report({ increment: 20, message: `Functions Runtime` });
          await timeout(validateFuncCoreToolsIsLatest, dependencyTimeout, dependenciesVersions?.funcCoreTools);
          await setFunctionsCommand();
        });

        context.telemetry.properties.lastStep = 'validateDotNetIsLatest';
        await runWithDurationTelemetry(context, 'azureLogicAppsStandard.validateDotNetIsLatest', async () => {
          progress.report({ increment: 20, message: `.NET SDK` });
          await timeout(validateDotNetIsLatest, dependencyTimeout, dependenciesVersions?.dotnet);
          await setDotNetCommand();
        });
        ext.outputChannel.appendLog(
          localize(
            'azureLogicApsBinariesSucessfull',
            'Azure Logic Apps Standard Runtime Dependencies validation and installation completed successfully.'
          )
        );
      } catch (error) {
        ext.outputChannel.appendLog(
          localize('azureLogicApsBinariesError', 'Error in dependencies validation and installation: "{0}"...', error)
        );
        context.telemetry.properties.dependenciesError = error;
      }
    }
  );
}
