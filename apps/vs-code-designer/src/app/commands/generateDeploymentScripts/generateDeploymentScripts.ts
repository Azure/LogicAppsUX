/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName, workflowSubscriptionIdKey } from '../../../../src/constants';
import { localize } from '../../../localize';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import { getLocalSettingsFile } from '../appSettings/getLocalSettingsFile';
import type { IAzureScriptWizard } from './azureScriptWizard';
import { createAzureWizard } from './azureScriptWizard';
import type { IActionContext, AzureWizard } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension';
import * as path from 'path';
import * as vscode from 'vscode';

export async function generateDeploymentScripts(context: IActionContext): Promise<void> {
  const message: string = localize('selectLocalSettings', 'Select your local settings file.');
  const localSettingsFile: string = await getLocalSettingsFile(context, message);
  const projectPath: string = path.dirname(localSettingsFile);
  const localSettingsFilePath: string = path.join(projectPath, localSettingsFileName);
  const localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsFilePath);
  const connectorsContext: IAzureScriptWizard = context as IAzureScriptWizard;
  const subscriptionId: string = localSettings.Values[workflowSubscriptionIdKey];

  if (subscriptionId === undefined || subscriptionId === '') {
    const wizard: AzureWizard<IAzureScriptWizard> = createAzureWizard(connectorsContext, projectPath);
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
