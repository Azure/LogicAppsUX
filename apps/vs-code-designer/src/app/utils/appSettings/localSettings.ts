/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  azureWebJobsStorageKey,
  localSettingsFileName,
  appKindSetting,
  azureWebJobsSecretStorageTypeKey,
  azureStorageTypeSetting,
} from '../../../constants';
import { localize } from '../../../localize';
import { decryptLocalSettings } from '../../commands/appSettings/decryptLocalSettings';
import { encryptLocalSettings } from '../../commands/appSettings/encryptLocalSettings';
import { executeOnFunctions } from '../../functionsExtension/executeOnFunctionsExt';
import { writeFormattedJson } from '../fs';
import { parseJson } from '../parseJson';
import { generateDesignTimeLocalSettingsJson, generateLocalSettingsJson } from '../../projectConsistency/fileGenerators';
import { DialogResponses, parseError } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { MismatchBehavior, type ILocalSettingsJson  } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Uri } from 'vscode';
import { useNodeDesignTimeWorker } from '../vsCodeConfig/settings';
import { detectProjectType } from '../project';

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
  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, projectPath, isDesignTime);

  settings.Values = settings.Values || {};
  settings.Values = {
    ...settings.Values,
    ...settingsToAdd,
  };

  await writeFormattedJson(localSettingsPath, settings);
}

/**
 * Gets local.settings.json file.
 * @param {IActionContext} context - Command context.
 * @param {string} projectPath - The logic app project path.
 * @param {boolean} isDesignTime - A flag indicating whether it is design time or not.
 * @returns {Promise<ILocalSettingsJson>} local.setting.json file.
 */
export async function getLocalSettingsJson(
  context: IActionContext,
  projectPath: string,
  isDesignTime = false
): Promise<ILocalSettingsJson> {
  const localSettingsPath = path.join(projectPath, localSettingsFileName);
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

  const projectType = await detectProjectType(projectPath);
  const useNodeWorker = useNodeDesignTimeWorker(projectPath);
  return isDesignTime
    ? generateDesignTimeLocalSettingsJson(projectPath, projectType, useNodeWorker)
    : generateLocalSettingsJson(projectPath, projectType);
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
 * Set local.settings.json values.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The logic app project path.
 * @param {string} key - The key to be updated.
 * @param {string} value - The value to be updated.
 * @param {MismatchBehavior} behavior - The behaviour of the update.
 */
export async function setLocalAppSetting(
  context: IActionContext,
  projectPath: string,
  key: string,
  value: string,
  behavior: MismatchBehavior = MismatchBehavior.Prompt
): Promise<void> {
  const localSettingsPath: string = path.join(projectPath, localSettingsFileName);
  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, projectPath);

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

  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, projectPath);
  return settings.Values && settings.Values[azureWebJobsStorageKey];
}

export async function removeAppKindFromLocalSettings(projectPath: string, context: IActionContext): Promise<void> {
  const localSettingsPath: string = path.join(projectPath, localSettingsFileName);
  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, projectPath);

  if (settings.Values && settings.Values[appKindSetting]) {
    delete settings.Values[appKindSetting];
    await writeFormattedJson(localSettingsPath, settings);
  }
}
