/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { validateAndInstallBinaries } from '../commands/binaries/validateAndInstallBinaries';
import { runWithDurationTelemetry } from './telemetry';
import { validateTasksJson } from './vsCodeConfig/tasks';
import { extensionCommand, autoRuntimeDependenciesValidationAndInstallationSetting } from '../../constants';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { getGlobalSetting } from './vsCodeConfig/settings';
import { isDevContainerWorkspace } from './devContainerUtils';

export const useBinariesDependencies = async (): Promise<boolean> => {
  const isDevContainer = await isDevContainerWorkspace();
  if (isDevContainer) {
    return false;
  }

  const binariesInstallation = getGlobalSetting(autoRuntimeDependenciesValidationAndInstallationSetting);
  return !!binariesInstallation;
};

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
