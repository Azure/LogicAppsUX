/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName, webhookRedirectHostUri } from '../../../../constants';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getContainingWorkspace, getWorkspaceFolder } from '../../../utils/workspace';
import { ConfigureRedirectEndpointStep } from './configureWebhookRedirectEndpointSteps/ConfigureRedirectEndpointStep';
import { SaveWebhookContextStep } from './configureWebhookRedirectEndpointSteps/SaveWebhookContextStep';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureWizard, nonNullValue } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import type { Uri, WorkspaceFolder } from 'vscode';

export interface IWebhookContext extends IActionContext {
  redirectEndpoint: string;
}

export async function configureWebhookRedirectEndpoint(context: IActionContext, data: Uri): Promise<void> {
  let workspaceFolder: WorkspaceFolder;

  if (data?.fsPath) {
    workspaceFolder = nonNullValue(getContainingWorkspace(data.fsPath), 'workspaceFolder');
  } else {
    workspaceFolder = await getWorkspaceFolder(context);
  }

  const workspacePath = workspaceFolder?.uri?.fsPath;
  const projectPath = (await tryGetLogicAppProjectRoot(context, workspacePath)) || workspacePath;
  const localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName));
  const redirectEndpoint: string = localSettings.Values[webhookRedirectHostUri] || '';
  const wizardContext = {
    ...context,
    redirectEndpoint,
  } as IWebhookContext;
  const wizard = new AzureWizard(wizardContext, {
    promptSteps: [new ConfigureRedirectEndpointStep()],
    executeSteps: [new SaveWebhookContextStep(projectPath, wizardContext.redirectEndpoint)],
  });

  await wizard.prompt();
  await wizard.execute();
}
