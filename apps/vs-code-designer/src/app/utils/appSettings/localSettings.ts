/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName } from '../../../constants';
import { localize } from '../../../localize';
import { writeFormattedJson } from '../fs';
import { parseJson } from '../parseJson';
import { DialogResponses, parseError } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { MessageItem } from 'vscode';

/**
 * Updates local.settings.json file
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
 * Gets local.settings.json file
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

    if (/[^\s]/.test(data)) {
      try {
        return parseJson(data);
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
