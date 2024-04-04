/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName, workflowSubscriptionIdKey } from '../../../../src/constants';
import { localize } from '../../../localize';
import type { IAzureConnectorsContext } from '../../commands/workflows/azureConnectorWizard';
import { createAzureWizard } from '../../commands/workflows/azureConnectorWizard';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import { getLocalSettingsFile } from '../appSettings/getLocalSettingsFile';
import type { AzureWizard, IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import * as vscode from 'vscode';

export async function enableAzureConnectors(context: IActionContext): Promise<void> {
  const message: string = localize('selectLocalSettings', 'Select your local settings file.');
  const localSettingsFile: string = await getLocalSettingsFile(context, message);
  const projectPath: string = path.dirname(localSettingsFile);
  const localSettingsFilePath: string = path.join(projectPath, localSettingsFileName);
  const localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsFilePath);
  const connectorsContext: IAzureConnectorsContext = context as IAzureConnectorsContext;
  const subscriptionId: string = localSettings.Values[workflowSubscriptionIdKey];

  if (subscriptionId === undefined || subscriptionId === '') {
    const wizard: AzureWizard<IAzureConnectorsContext> = createAzureWizard(connectorsContext, projectPath);
    await wizard.prompt();
    await wizard.execute();
    vscode.window.showInformationMessage(
      localize(
        'logicapp.azureConnectorsEnabledForProject',
        'Azure connectors are enabled for the project. Reload the designer panel to start using the connectors.'
      )
    );
  } else {
    await vscode.window.showInformationMessage(
      localize('logicapp.azureConnectorsEnabledForWorkflow', 'Azure connectors are enabled for the workflow.')
    );
  }
}
