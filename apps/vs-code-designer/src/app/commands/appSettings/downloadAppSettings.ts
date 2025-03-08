/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName, logicAppFilter, viewOutput } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeOnFunctions } from '../../functionsExtension/executeOnFunctionsExt';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import { decryptLocalSettings } from './decryptLocalSettings';
import { encryptLocalSettings } from './encryptLocalSettings';
import { getLocalSettingsFile } from './getLocalSettingsFile';
import type { StringDictionary } from '@azure/arm-appservice';
import type { IAppSettingsClient } from '@microsoft/vscode-azext-azureappservice';
import { AppSettingsTreeItem, confirmOverwriteSettings } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';

export async function downloadAppSettings(context: IActionContext, node?: AppSettingsTreeItem): Promise<void> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<AppSettingsTreeItem>(context, {
      filter: logicAppFilter,
      expectedChildContextValue: new RegExp(AppSettingsTreeItem.contextValue),
    });
  }

  const client: IAppSettingsClient = await node.clientProvider.createClient(context);

  await node.runWithTemporaryDescription(context, localize('downloading', 'Downloading...'), async () => {
    await downloadAppSettingsInternal(context, client);
  });
}

export async function downloadAppSettingsInternal(context: IActionContext, client: IAppSettingsClient): Promise<void> {
  const message: string = localize('selectLocalSettings', 'Select the destination file for your downloaded settings.');
  const localSettingsPath: string = await getLocalSettingsFile(context, message);
  const localSettingsUri: vscode.Uri = vscode.Uri.file(localSettingsPath);

  let localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath);

  const isEncrypted: boolean | undefined = localSettings.IsEncrypted;

  if (isEncrypted) {
    await executeOnFunctions(decryptLocalSettings, context, localSettingsUri);
    localSettings = (await fse.readJson(localSettingsPath)) as ILocalSettingsJson;
  }

  try {
    if (!localSettings.Values) {
      localSettings.Values = {};
    }

    const remoteSettings: StringDictionary = await client.listApplicationSettings();

    ext.outputChannel.appendLog(localize('downloadingSettings', 'Downloading settings...'), { resourceName: client.fullName });
    if (remoteSettings.properties) {
      await confirmOverwriteSettings(context, remoteSettings.properties, localSettings.Values, localSettingsFileName);
    }

    await fse.ensureFile(localSettingsPath);
    await fse.writeJson(localSettingsPath, localSettings, { spaces: 2 });
  } finally {
    if (isEncrypted) {
      await executeOnFunctions(encryptLocalSettings, context, localSettingsUri);
    }
  }

  ext.outputChannel.appendLog(localize('downloadedSettings', 'Successfully downloaded settings.'), { resourceName: client.fullName });
  const openFile: string = localize('openFile', 'Open File');

  vscode.window
    .showInformationMessage(
      localize('downloadedSettingsFrom', 'Successfully downloaded settings from "{0}".', client.fullName),
      openFile,
      viewOutput
    )
    .then(async (result) => {
      if (result === openFile) {
        const doc: vscode.TextDocument = await vscode.workspace.openTextDocument(localSettingsUri);
        await vscode.window.showTextDocument(doc);
      } else if (result === viewOutput) {
        ext.outputChannel.show();
      }
    });
}
