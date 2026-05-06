/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { validateAndInstallBinaries } from './app/commands/binaries/validateAndInstallBinaries';
import { installBinaries, useBinariesDependencies } from './app/utils/binaries';
import { promptStartDesignTimeOption } from './app/utils/codeless/startDesignTimeApi';
import { runWithDurationTelemetry } from './app/utils/telemetry';
import { validateTasksJson } from './app/utils/vsCodeConfig/tasks';
import {
  extensionCommand,
  autoRuntimeDependenciesValidationAndInstallationSetting,
  autoStartDesignTimeSetting,
  showStartDesignTimeMessageSetting,
} from './constants';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { isDevContainerWorkspace } from './app/utils/devContainerUtils';

/**
 * Prompts warning message for installing the installing/validate binaries and taks.json.
 * @param {IActionContext} activateContext - Activation context.
 */
export const onboardBinaries = async (activateContext: IActionContext) => {
  await callWithTelemetryAndErrorHandling(extensionCommand.validateAndInstallBinaries, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, extensionCommand.validateAndInstallBinaries, async () => {
      const binariesInstallation = await useBinariesDependencies();
      if (binariesInstallation) {
        activateContext.telemetry.properties.lastStep = extensionCommand.validateAndInstallBinaries;
        await validateAndInstallBinaries(actionContext);
        await validateTasksJson(actionContext, vscode.workspace.workspaceFolders);
      }
    });
  });
};

/**
 * Start onboarding experience prompting inputs for user.
 * This function will propmpt/install dependencies binaries, start design time api and start azurite.
 * Skips onboarding for devContainer workspaces as they have pre-configured environments.
 * @param {IActionContext} activateContext - Activation context.
 */
export const startOnboarding = async (activateContext: IActionContext) => {
  // Skip onboarding for devContainer workspaces
  const isDevContainer = await isDevContainerWorkspace();
  if (isDevContainer) {
    activateContext.telemetry.properties.skippedOnboarding = 'true';
    activateContext.telemetry.properties.skippedReason = 'devContainer';
    return;
  }  

  await callWithTelemetryAndErrorHandling(
    autoRuntimeDependenciesValidationAndInstallationSetting,
    async (actionContext: IActionContext) => {
      const binariesInstallStartTime = Date.now();
      await runWithDurationTelemetry(actionContext, autoRuntimeDependenciesValidationAndInstallationSetting, async () => {
        activateContext.telemetry.properties.lastStep = autoRuntimeDependenciesValidationAndInstallationSetting;
        await installBinaries(actionContext);
      });
      activateContext.telemetry.measurements.binariesInstallDuration = Date.now() - binariesInstallStartTime;
    }
  );

  await callWithTelemetryAndErrorHandling(autoStartDesignTimeSetting, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, showStartDesignTimeMessageSetting, async () => {
      await promptStartDesignTimeOption(activateContext);
    });
  });
};
