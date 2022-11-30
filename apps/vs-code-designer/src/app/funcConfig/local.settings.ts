/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName } from '../../constants';
import { localize } from '../../localize';
import * as fsUtil from '../utils/fs';
import { parseJson } from '../utils/parseJson';
import { DialogResponses, parseError } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import type { MessageItem } from 'vscode';

import path = require('path');

export interface ILocalSettingsJson {
  IsEncrypted?: boolean;
  Values?: { [key: string]: string };
  Host?: { [key: string]: string };
  ConnectionStrings?: { [key: string]: string };
}

export async function addOrUpdateLocalAppSettings(
  context: IActionContext,
  functionAppPath: string,
  settingsToAdd: Record<string, string>
): Promise<void> {
  const localSettingsPath: string = path.join(functionAppPath, localSettingsFileName);
  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath);

  // tslint:disable-next-line:strict-boolean-expressions
  settings.Values = settings.Values || {};
  settings.Values = {
    ...settings.Values,
    ...settingsToAdd,
  };

  await fsUtil.writeFormattedJson(localSettingsPath, settings);
}

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
