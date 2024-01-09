/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { validateAndInstallBinaries } from './app/commands/binaries/validateAndInstallBinaries';
import { promptInstallBinariesOption } from './app/utils/binaries';
import { downloadExtensionBundle } from './app/utils/bundleFeed';
import { promptStartDesignTimeOption } from './app/utils/codeless/startDesignTimeApi';
import { runWithDurationTelemetry } from './app/utils/telemetry';
import { getGlobalSetting } from './app/utils/vsCodeConfig/settings';
import { validateTasksJson } from './app/utils/vsCodeConfig/tasks';
import {
  extensionCommand,
  autoRuntimeDependenciesValidationAndInstallationSetting,
  autoStartDesignTimeSetting,
  showStartDesignTimeMessageSetting,
} from './constants';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

/**
 * Prompts warning message for installing the installing/validate binaries and taks.json.
 * @param {IActionContext} activateContext - Activation context.
 */
export const onboardBinaries = async (activateContext: IActionContext) => {
  callWithTelemetryAndErrorHandling(extensionCommand.validateAndInstallBinaries, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, extensionCommand.validateAndInstallBinaries, async () => {
      const binariesInstallation = getGlobalSetting(autoRuntimeDependenciesValidationAndInstallationSetting);
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
 * @param {IActionContext} activateContext - Activation context.
 */
export const startOnboarding = async (activateContext: IActionContext) => {
  callWithTelemetryAndErrorHandling(autoRuntimeDependenciesValidationAndInstallationSetting, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, autoRuntimeDependenciesValidationAndInstallationSetting, async () => {
      activateContext.telemetry.properties.lastStep = autoRuntimeDependenciesValidationAndInstallationSetting;
      await promptInstallBinariesOption(actionContext);
    });
  });

  await onboardBinaries(activateContext);
  await downloadExtensionBundle(activateContext);

  await callWithTelemetryAndErrorHandling(autoStartDesignTimeSetting, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, showStartDesignTimeMessageSetting, async () => {
      await promptStartDesignTimeOption(activateContext);
    });
  });
};
