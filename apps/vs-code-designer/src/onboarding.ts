/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { installBinaries } from './app/utils/binaries';
import { promptStartDesignTimeOption, scheduleStartAllDesignTimeApis } from './app/utils/codeless/startDesignTimeApi';
import { runWithDurationTelemetry } from './app/utils/telemetry';
import {
  autoRuntimeDependenciesValidationAndInstallationSetting,
  autoStartDesignTimeSetting,
  showStartDesignTimeMessageSetting,
} from './constants';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import { isDevContainerWorkspace } from './app/utils/devContainerUtils';
import { ext } from './extensionVariables';

/**
 * Start onboarding experience prompting inputs for user.
 * This function will prompt/install dependencies binaries and start the design time api.
 * Devcontainer workspaces skip dependency onboarding but still auto-start design time.
 * @param {IActionContext} activateContext - Activation context.
 */
export const startOnboarding = async (activateContext: IActionContext) => {
  const isDevContainer = await isDevContainerWorkspace();
  activateContext.telemetry.properties.isDevContainer = String(isDevContainer);

  if (isDevContainer) {
    activateContext.telemetry.properties.skippedDependencyOnboarding = 'true';
    activateContext.telemetry.properties.skippedDependencyOnboardingReason = 'devContainer';
    ext.outputChannel.appendLog('Devcontainer workspace detected. Skipping dependency onboarding and auto-starting design time APIs.');
  } else {
    callWithTelemetryAndErrorHandling(autoRuntimeDependenciesValidationAndInstallationSetting, async (actionContext: IActionContext) => {
      const binariesInstallStartTime = Date.now();
      await runWithDurationTelemetry(actionContext, autoRuntimeDependenciesValidationAndInstallationSetting, async () => {
        activateContext.telemetry.properties.lastStep = autoRuntimeDependenciesValidationAndInstallationSetting;
        await installBinaries(actionContext);
      });
      activateContext.telemetry.measurements.binariesInstallDuration = Date.now() - binariesInstallStartTime;
    });
  }

  await callWithTelemetryAndErrorHandling(autoStartDesignTimeSetting, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, showStartDesignTimeMessageSetting, async () => {
      if (isDevContainer) {
        activateContext.telemetry.properties.designTimeStartupMode = 'devContainerAutoStart';
        activateContext.telemetry.properties.designTimeStartupState = 'scheduled';
        ext.outputChannel.appendLog('Scheduling background design-time startup for devcontainer workspace.');
        scheduleStartAllDesignTimeApis();
      } else {
        await promptStartDesignTimeOption(activateContext);
      }
    });
  });
};
