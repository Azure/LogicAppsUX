/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  appKindSetting,
  azureWebJobsFeatureFlagsKey,
  azureWebJobsSecretStorageTypeKey,
  azureWebJobsStorageKey,
  azureStorageTypeSetting,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  localEmulatorConnectionString,
  multiLanguageWorkerSetting,
  ProjectDirectoryPathKey,
  logicAppKind,
  workflowAuthenticationMethodKey,
  workflowAuthenticationMethodMIValue,
  workflowCodefulEnabledKey,
  workerRuntimeKey,
} from '../../../../constants';
import { isManagedIdentityAuthEnabled } from '../../vsCodeConfig/settings';
import { ProjectType, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';

/**
 * Generates the canonical local.settings.json content for a Logic App project.
 *
 * @param projectPath - The project path (used for ProjectDirectoryPath).
 * @param logicAppType - The project type (affects feature flags and codeful settings).
 */
export function generateLocalSettingsJson(
  projectPath?: string,
  logicAppType?: ProjectType
): ILocalSettingsJson {
  const values: Record<string, string> = {};

  values[azureWebJobsStorageKey] = localEmulatorConnectionString;
  values[functionsInprocNet8Enabled] = functionsInprocNet8EnabledTrue;
  values[workerRuntimeKey] = WorkerRuntime.Dotnet;
  values[appKindSetting] = logicAppKind;
  if (projectPath) {
    values[ProjectDirectoryPathKey] = projectPath;
  }
  if (isManagedIdentityAuthEnabled()) {
    values[workflowAuthenticationMethodKey] = workflowAuthenticationMethodMIValue;
  }
  if (logicAppType !== undefined && logicAppType !== ProjectType.logicApp) {
    values[azureWebJobsFeatureFlagsKey] = multiLanguageWorkerSetting;
  }

  if (logicAppType === ProjectType.codeful) {
    values[workflowCodefulEnabledKey] = 'true';
  }

  return {
    IsEncrypted: false,
    Values: values,
  };
}

/**
 * Generates the canonical design-time local.settings.json content for a Logic App project.
 *
 * @param isDesignTime - Whether to generate design-time settings (workflow-designtime folder).
 * @param projectPath - The project path (used for ProjectDirectoryPath).
 * @param logicAppType - The project type (affects feature flags and codeful settings).
 * @param useNodeWorker - Whether to use Node runtime for design-time (default: false/dotnet).
 */
export function generateDesignTimeLocalSettingsJson(
  projectPath?: string,
  logicAppType?: ProjectType,
  useNodeWorker = false
): ILocalSettingsJson {
  const values: Record<string, string> = {};

  values[appKindSetting] = logicAppKind;
  if (projectPath) {
    values[ProjectDirectoryPathKey] = projectPath;
  }
  if (useNodeWorker) {
    values[workerRuntimeKey] = WorkerRuntime.Node;
  } else {
    values[workerRuntimeKey] = WorkerRuntime.Dotnet;
    values[functionsInprocNet8Enabled] = functionsInprocNet8EnabledTrue;
  }
  values[azureWebJobsSecretStorageTypeKey] = azureStorageTypeSetting;

  if (logicAppType === ProjectType.codeful) {
    values[workflowCodefulEnabledKey] = 'true';
  }

  return {
    IsEncrypted: false,
    Values: values,
  };
}
