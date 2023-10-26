/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { activateAzurite } from './app/utils/azurite/activateAzurite';
import { promptInstallBinariesOption, validateAndInstallBinaries } from './app/utils/binaries';
import { promptStartDesignTimeOption } from './app/utils/codeless/startDesignTimeApi';
import { runWithDurationTelemetry } from './app/utils/telemetry';
import { getGlobalSetting } from './app/utils/vsCodeConfig/settings';
import { validateTasksJson } from './app/utils/vsCodeConfig/tasks';
import {
  extensionCommand,
  autoBinariesInstallationSetting,
  autoStartDesignTimeSetting,
  showStartDesignTimeMessageSetting,
  showAutoStartAzuriteWarning,
} from './constants';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

export const onboardBinaries = async (activateContext: IActionContext) => {
  callWithTelemetryAndErrorHandling(extensionCommand.validateAndInstallBinaries, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, extensionCommand.validateAndInstallBinaries, async () => {
      const binariesInstallation = getGlobalSetting(autoBinariesInstallationSetting);
      if (binariesInstallation) {
        activateContext.telemetry.properties.lastStep = extensionCommand.validateAndInstallBinaries;
        await validateAndInstallBinaries(actionContext);
        await validateTasksJson(actionContext, vscode.workspace.workspaceFolders);
      }
    });
  });
};

export const startOnboarding = async (activateContext: IActionContext) => {
  callWithTelemetryAndErrorHandling(autoBinariesInstallationSetting, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, autoBinariesInstallationSetting, async () => {
      activateContext.telemetry.properties.lastStep = autoBinariesInstallationSetting;
      await promptInstallBinariesOption(actionContext);
    });
  });

  await onboardBinaries(activateContext);

  callWithTelemetryAndErrorHandling(autoStartDesignTimeSetting, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, showStartDesignTimeMessageSetting, async () => {
      await promptStartDesignTimeOption(activateContext);
    });
  });

  callWithTelemetryAndErrorHandling(showAutoStartAzuriteWarning, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, showAutoStartAzuriteWarning, async () => {
      activateContext.telemetry.properties.lastStep = showAutoStartAzuriteWarning;
      activateAzurite(activateContext);
    });
  });
};
