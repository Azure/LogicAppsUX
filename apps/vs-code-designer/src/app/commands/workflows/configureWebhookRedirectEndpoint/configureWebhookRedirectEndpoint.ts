/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { webhookRedirectHostUri } from '../../../../constants';
import { localize } from '../../../../localize';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import { selectLogicAppRoot, getParentLogicAppRoot } from '../../../utils/workspace';
import { ConfigureRedirectEndpointStep } from './configureWebhookRedirectEndpointSteps/ConfigureRedirectEndpointStep';
import { SaveWebhookContextStep } from './configureWebhookRedirectEndpointSteps/SaveWebhookContextStep';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import type { Uri } from 'vscode';

export interface IWebhookContext extends IActionContext {
  redirectEndpoint: string;
}

export async function configureWebhookRedirectEndpoint(context: IActionContext, node?: Uri): Promise<void> {
  const projectPath = node?.fsPath ? await getParentLogicAppRoot(node.fsPath) : await selectLogicAppRoot(context);

  if (!projectPath) {
    throw new Error(localize('LogicAppRootError', 'Unable to determine logic app project root.'));
  }

  const localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, projectPath);
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
