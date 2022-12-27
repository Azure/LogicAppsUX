/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName } from '../../constants';
import { localize } from '../../localize';
import { writeFormattedJson } from '../utils/fs';
import { getLocalSettingsJson } from '../utils/localSettings';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension';
import { MismatchBehavior } from '@microsoft/vscode-extension';
import * as path from 'path';

export async function setLocalAppSetting(
  context: IActionContext,
  functionAppPath: string,
  key: string,
  value: string,
  behavior: MismatchBehavior = MismatchBehavior.Prompt
): Promise<void> {
  const localSettingsPath: string = path.join(functionAppPath, localSettingsFileName);
  const settings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath);

  settings.Values = settings.Values || {};
  if (settings.Values[key] === value) {
    return;
  } else if (settings.Values[key]) {
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
