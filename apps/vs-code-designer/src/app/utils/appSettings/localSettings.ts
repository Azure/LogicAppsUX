/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { azureWebJobsStorageKey, localSettingsFileName } from '../../../constants';
import { localize } from '../../../localize';
import { decryptLocalSettings } from '../../commands/appSettings/decryptLocalSettings';
import { encryptLocalSettings } from '../../commands/appSettings/encryptLocalSettings';
import { executeOnFunctions } from '../../functionsExtension/executeOnFunctionsExt';
import { writeFormattedJson } from '../fs';
import { parseJson } from '../parseJson';
import { DialogResponses, parseError } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { MismatchBehavior } from '@microsoft/vscode-extension-logic-apps';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { MessageItem } from 'vscode';
import { Uri } from 'vscode';

/**
 * Updates local.settings.json file.
 * @param {IActionContext} context - Command context.
 * @param {string} projectPath - Project path with local.settings.json file.
 * @param {boolean} settingsToAdd - Settings data to updata.
 */
export async function addOrUpdateLocalAppSettings(
  context: IActionContext,
  projectPath: string,
  settingsToAdd: Record<string, string>
): Promise<void> {
  const localSettingsPath: string = path.join(projectPath, localSettingsFileName);
  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath);

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
async function getDecriptedLocalSettings(
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
 * @param {boolean} allowOverwrite - Allow overwrite on file.
 * @returns {Promise<ILocalSettingsJson>} local.setting.json file.
 */
export async function getLocalSettingsJson(
  context: IActionContext,
  localSettingsPath: string,
  allowOverwrite = false
): Promise<ILocalSettingsJson> {
  if (await fse.pathExists(localSettingsPath)) {
    const data: string = (await fse.readFile(localSettingsPath)).toString();
    const localSettingsUri: Uri = Uri.file(localSettingsPath);

    if (/[^\s]/.test(data)) {
      try {
        const localSettings = parseJson(data) as ILocalSettingsJson;
        return getDecriptedLocalSettings(context, localSettings, localSettingsUri, localSettingsPath);
      } catch (error) {
        if (allowOverwrite) {
          const message: string = localize(
            'failedToParseWithOverwrite',
            'Failed to parse "{0}": {1}. Overwrite?',
            localSettingsFileName,
            parseError(error).message
          );
          const overwriteButton: MessageItem = { title: localize('overwrite', 'Overwrite') };
          // Overwrite is the only button and cancel automatically throws, so no need to check result
          await context.ui.showWarningMessage(
            message,
            { modal: true, stepName: 'overwriteLocalSettings' },
            overwriteButton,
            DialogResponses.cancel
          );
        } else {
          const message: string = localize(
            'failedToParse',
            'Failed to parse "{0}": {1}.',
            localSettingsFileName,
            parseError(error).message
          );
          throw new Error(message);
        }
      }
    }
  }

  return {
    IsEncrypted: false,
    Values: {
      AzureWebJobsStorage: '',
    },
  };
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
