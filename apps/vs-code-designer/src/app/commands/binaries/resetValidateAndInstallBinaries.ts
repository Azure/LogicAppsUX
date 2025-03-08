/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  autoRuntimeDependenciesPathSettingKey,
  autoRuntimeDependenciesValidationAndInstallationSetting,
  dotNetBinaryPathSettingKey,
  funcCoreToolsBinaryPathSettingKey,
  nodeJsBinaryPathSettingKey,
} from '../../../constants';
import { localize } from '../../../localize';
import { updateGlobalSetting } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

/**
 * Resets the path settings for auto runtime dependencies, dotnet binary, node js binary, and func core tools binary.
 * @param {vscode.Progress} progress - The progress object to report the progress of the reset operation.
 */
const resetBinariesPathSettings = async (
  progress: vscode.Progress<{
    message?: string;
    increment?: number;
  }>
) => {
  await updateGlobalSetting(autoRuntimeDependenciesPathSettingKey, undefined);
  progress.report({ increment: 40, message: localize('resetDependenciesPath', 'Reset auto runtime dependencies path') });

  await updateGlobalSetting(dotNetBinaryPathSettingKey, undefined);
  progress.report({ increment: 60, message: localize('resetDotnet', 'Reset dotnet binary path') });

  await updateGlobalSetting(nodeJsBinaryPathSettingKey, undefined);
  progress.report({ increment: 80, message: localize('resetNodeJs', 'Reset node js binary path') });

  await updateGlobalSetting(funcCoreToolsBinaryPathSettingKey, undefined);
  progress.report({ increment: 100, message: localize('resetFuncCoreTools', 'Reset func core tools binary path') });
};

/**
 * Resets the auto validation and installation of binaries dependencies.
 * @param {IActionContext} context The action context.
 */
export const resetValidateAndInstallBinaries = async (context: IActionContext) => {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification, // Location of the progress indicator
      title: localize('resetBinariesDependencies', 'Resetting binaries dependencies settings'), // Title displayed in the progress notification
      cancellable: false, // Allow the user to cancel the task
    },
    async (progress) => {
      await updateGlobalSetting(autoRuntimeDependenciesValidationAndInstallationSetting, true);
      progress.report({ increment: 20, message: localize('resetValidation', 'Reset auto runtime validation and installation') });
      await resetBinariesPathSettings(progress);
      context.telemetry.properties.resetBinariesDependencies = 'true';
    }
  );
};

/**
 * Disables the auto validation and installation of binaries dependencies.
 * @param {IActionContext} context The action context.
 */
export const disableValidateAndInstallBinaries = async (context: IActionContext) => {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification, // Location of the progress indicator
      title: localize('disableBinariesDependencies', 'Disabling binaries dependencies settings'), // Title displayed in the progress notification
      cancellable: false, // Allow the user to cancel the task
    },
    async (progress) => {
      await updateGlobalSetting(autoRuntimeDependenciesValidationAndInstallationSetting, false);
      progress.report({ increment: 20, message: localize('disableValidation', 'Disable auto runtime validation and installation') });
      await resetBinariesPathSettings(progress);
      context.telemetry.properties.disableBinariesDependencies = 'true';
    }
  );
};
