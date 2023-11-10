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

export const resetValidateAndInstallBinaries = async (context: IActionContext) => {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification, // Location of the progress indicator
      title: localize('resetBinariesDependencies', 'Resetting binaries dependencies settings'), // Title displayed in the progress notification
      cancellable: false, // Allow the user to cancel the task
    },
    async (progress) => {
      await updateGlobalSetting(autoRuntimeDependenciesValidationAndInstallationSetting, undefined);
      progress.report({ increment: 20, message: localize('resetValidation', 'Reset auto runtime validation and installation') });

      await updateGlobalSetting(autoRuntimeDependenciesPathSettingKey, undefined);
      progress.report({ increment: 40, message: localize('resetDependenciesPath', 'Reset auto runtime dependencies path') });

      await updateGlobalSetting(dotNetBinaryPathSettingKey, undefined);
      progress.report({ increment: 60, message: localize('resetDotnet', 'Reset dotnet binary path') });

      await updateGlobalSetting(nodeJsBinaryPathSettingKey, undefined);
      progress.report({ increment: 80, message: localize('resetNodeJs', 'Reset node js binary path') });

      await updateGlobalSetting(funcCoreToolsBinaryPathSettingKey, undefined);
      progress.report({ increment: 100, message: localize('resetFuncCoreTools', 'Reset func core tools binary path') });

      context.telemetry.properties.resetBinariesDependencies = 'true';
    }
  );
};
