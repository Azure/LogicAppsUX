/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  azureWebJobsStorageKey,
  localSettingsFileName,
  ProjectDirectoryPathKey,
  appKindSetting,
  azureWebJobsSecretStorageTypeKey,
  azureWebJobsFeatureFlagsKey,
  localEmulatorConnectionString,
  logicAppKind,
  multiLanguageWorkerSetting,
  workerRuntimeKey,
  azureStorageTypeSetting,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  workflowCodefulEnabledKey,
} from '../../../constants';
import { localize } from '../../../localize';
import { decryptLocalSettings } from '../../commands/appSettings/decryptLocalSettings';
import { encryptLocalSettings } from '../../commands/appSettings/encryptLocalSettings';
import { executeOnFunctions } from '../../functionsExtension/executeOnFunctionsExt';
import { writeFormattedJson } from '../fs';
import { parseJson } from '../parseJson';
import { DialogResponses, parseError } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { MismatchBehavior, ProjectType, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Uri } from 'vscode';

/**
 * Updates local.settings.json file.
 * @param {IActionContext} context - Command context.
 * @param {string} projectPath - Project path with local.settings.json file.
 * @param {boolean} settingsToAdd - Settings data to updata.
 * @param {boolean} isDesignTime - A flag indicating whether it is design time or not.
 */
export async function addOrUpdateLocalAppSettings(
  context: IActionContext,
  projectPath: string,
  settingsToAdd: Record<string, string>,
  isDesignTime = false
): Promise<void> {
  const localSettingsPath: string = path.join(projectPath, localSettingsFileName);
  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath, isDesignTime);

  settings.Values = settings.Values || {};
  settings.Values = {
    ...settings.Values,
    ...settingsToAdd,
  };

  await writeFormattedJson(localSettingsPath, settings);
}

/**
 * Gets decrypted local.settings.
 * @param {IActionContext} context - Command context.
 * @param {ILocalSettingsJson} localSettings - Parsed local settings.
 * @param {Uri} localSettingsUri - File Uri.
 * @param {string} localSettingsPath - File path.
 * @returns {Promise<ILocalSettingsJson>} local.setting.json file.
 */
async function getDecryptedLocalSettings(
  context: IActionContext,
  localSettings: ILocalSettingsJson,
  localSettingsUri: Uri,
  localSettingsPath: string
): Promise<ILocalSettingsJson> {
  if (localSettings.IsEncrypted) {
    await executeOnFunctions(decryptLocalSettings, context, localSettingsUri);
    try {
      return (await fse.readJson(localSettingsPath)) as ILocalSettingsJson;
    } finally {
      await executeOnFunctions(encryptLocalSettings, context, localSettingsUri);
    }
  }
  return localSettings;
}

/**
 * Gets local.settings.json file.
 * @param {IActionContext} context - Command context.
 * @param {string} localSettingsPath - File path.
 * @param {boolean} isDesignTime - A flag indicating whether it is design time or not.
 * @returns {Promise<ILocalSettingsJson>} local.setting.json file.
 */
export async function getLocalSettingsJson(
  context: IActionContext,
  localSettingsPath: string,
  isDesignTime = false
): Promise<ILocalSettingsJson> {
  if (fse.existsSync(localSettingsPath)) {
    const data: string = (await fse.readFile(localSettingsPath)).toString();
    const localSettingsUri: Uri = Uri.file(localSettingsPath);

    if (/[^\s]/.test(data)) {
      try {
        const localSettings = parseJson(data) as ILocalSettingsJson;
        localSettings.Values = localSettings.Values || {};
        const decryptedlocalSettings = await getDecryptedLocalSettings(context, localSettings, localSettingsUri, localSettingsPath);
        decryptedlocalSettings.Values ??= {};

        if (isDesignTime) {
          decryptedlocalSettings.Values![azureWebJobsSecretStorageTypeKey] = azureStorageTypeSetting;
          delete decryptedlocalSettings.Values![azureWebJobsStorageKey];
        }
        return decryptedlocalSettings;
      } catch (error) {
        const message: string = localize('failedToParse', 'Failed to parse "{0}": {1}.', localSettingsFileName, parseError(error).message);
        throw new Error(message);
      }
    }
  }

  return getLocalSettingsSchema(isDesignTime);
}

/**
 * Set local.settings.json values.
 * @param {IActionContext} context - Command context.
 * @param {string} logicAppPath - Project path.
 * @param {string} key - Key to be updated.
 * @param {string} value - Value to be updated.
 * @param {MismatchBehavior} behavior - Behaviour of the update.
 */
export async function setLocalAppSetting(
  context: IActionContext,
  logicAppPath: string,
  key: string,
  value: string,
  behavior: MismatchBehavior = MismatchBehavior.Prompt
): Promise<void> {
  const localSettingsPath: string = path.join(logicAppPath, localSettingsFileName);
  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath);

  settings.Values = settings.Values || {};
  if (settings.Values[key] === value) {
    return;
  }
  if (settings.Values[key]) {
    if (behavior === MismatchBehavior.Prompt) {
      const message: string = localize('SettingAlreadyExists', "Local app setting '{0}' already exists. Overwrite?", key);
      if (
        (await context.ui.showWarningMessage(message, { modal: true }, DialogResponses.yes, DialogResponses.cancel)) !== DialogResponses.yes
      ) {
        return;
      }
    } else if (behavior === MismatchBehavior.DontChange) {
      return;
    }
  }

  settings.Values[key] = value;
  await writeFormattedJson(localSettingsPath, settings);
}

/**
 * Gets azure web storage or emulator configuration.
 * @param {IActionContext} context - Command context.
 * @param {string} projectPath - Project path.
 * @returns {Promise<string | undefined>} Azure web storage or emulator configuration.
 */
export async function getAzureWebJobsStorage(context: IActionContext, projectPath: string): Promise<string | undefined> {
  if (process.env[azureWebJobsStorageKey]) {
    return process.env[azureWebJobsStorageKey];
  }

  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName));
  return settings.Values && settings.Values[azureWebJobsStorageKey];
}

/**
 * Builds the content for one of the two local.settings.json files this extension generates, from a
 * single source of truth so every path (fresh project creation, design-time API startup, and
 * regeneration of a source-controlled clone) produces byte-for-byte identical files that cannot drift
 * apart.
 *
 * The `isDesignTime` flag selects which file is produced:
 * - `true`  -> the `workflow-designtime/` folder file (Node worker runtime + secret storage type).
 * - `false` -> the project-root (runtime) file. Its key order mirrors the creation path
 *              (CreateLogicAppWorkspace.createLocalConfigurationFiles), and it is `ProjectType`-aware:
 *              non-plain types add the multi-language worker feature flag.
 *
 * `WORKFLOW_CODEFUL_ENABLED` is appended (last) for codeful projects in both files.
 * @param {boolean} isDesignTime - Whether to build the design-time folder file (true) or the project-root file (false).
 * @param {string} [projectPath] - Absolute path to the logic app project folder (ProjectDirectoryPath value). Omitted -> the key is not written.
 * @param {ProjectType} [logicAppType] - The logic app project type; drives the multi-language worker and codeful flags.
 * @param {boolean} [useNodeWorker] - Design-time only: emit the Node worker runtime (fallback) instead of dotnet + in-process .NET 8.
 * @returns {ILocalSettingsJson} The local.settings.json content.
 */
export const getLocalSettingsSchema = (
  isDesignTime: boolean,
  projectPath?: string,
  logicAppType?: ProjectType,
  useNodeWorker = false
): ILocalSettingsJson => {
  const values: Record<string, string> = {};

  if (isDesignTime) {
    // Design-time order: APP_KIND, ProjectDirectoryPath, FUNCTIONS_WORKER_RUNTIME, FUNCTIONS_INPROC_NET8_ENABLED, AzureWebJobsSecretStorageType.
    // Run the design-time host in-process .NET 8 so the Functions runtime spawns the NetFxWorker that the
    // Data Mapper Test map relies on for its XSLT transform. When the user opts into the Node-worker
    // fallback, emit the Node runtime instead (no in-process .NET 8 flag) at the cost of the Test map.
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
  } else {
    // Root order mirrors the creation path (CreateLogicAppWorkspace.createLocalConfigurationFiles) so a
    // regenerated local.settings.json is key-for-key identical to a freshly created project.
    values[azureWebJobsStorageKey] = localEmulatorConnectionString;
    values[functionsInprocNet8Enabled] = functionsInprocNet8EnabledTrue;
    values[workerRuntimeKey] = WorkerRuntime.Dotnet;
    values[appKindSetting] = logicAppKind;
    if (projectPath) {
      values[ProjectDirectoryPathKey] = projectPath;
    }
    if (logicAppType !== undefined && logicAppType !== ProjectType.logicApp) {
      values[azureWebJobsFeatureFlagsKey] = multiLanguageWorkerSetting;
    }
  }

  if (logicAppType === ProjectType.codeful) {
    values[workflowCodefulEnabledKey] = 'true';
  }

  return {
    IsEncrypted: false,
    Values: values,
  };
};

export async function removeAppKindFromLocalSettings(logicAppPath: string, context: IActionContext): Promise<void> {
  const localSettingsPath: string = path.join(logicAppPath, localSettingsFileName);
  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath);

  if (settings.Values && settings.Values[appKindSetting]) {
    delete settings.Values[appKindSetting];
    await writeFormattedJson(localSettingsPath, settings);
  }
}
