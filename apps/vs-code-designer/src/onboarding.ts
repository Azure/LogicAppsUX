/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { installBinaries } from './app/utils/binaries';
import { promptStartDesignTimeOption, scheduleStartAllDesignTimeApis } from './app/utils/codeless/startDesignTimeApi';
import { callWithDurationTelemetry } from './app/utils/telemetry';
import { extensionCommand } from './constants';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { isDevContainerWorkspace } from './app/utils/devContainerUtils';
import { ext } from './extensionVariables';
import { shouldRequireStrictDependencyValidation } from './app/utils/strictDependencyValidation';

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
    activateContext.telemetry.properties.lastStep = 'validateAndInstallBinaries';
    await callWithDurationTelemetry(extensionCommand.validateAndInstallBinaries, async (actionContext: IActionContext) => {
      if (!shouldRequireStrictDependencyValidation()) {
        actionContext.errorHandling.rethrow = false;
      }
      await installBinaries(actionContext);
    });
  }

  await callWithDurationTelemetry(extensionCommand.startDesignTimeApi, async (actionContext: IActionContext) => {
    // Design-time startup failures are non-blocking during activation
    actionContext.errorHandling.rethrow = false;
    if (isDevContainer) {
      actionContext.telemetry.properties.designTimeStartupMode = 'devContainerAutoStart';
      actionContext.telemetry.properties.designTimeStartupState = 'scheduled';
      ext.outputChannel.appendLog('Scheduling background design-time startup for devcontainer workspace.');
      scheduleStartAllDesignTimeApis();
    } else {
      await promptStartDesignTimeOption(actionContext);
    }
  });
};
