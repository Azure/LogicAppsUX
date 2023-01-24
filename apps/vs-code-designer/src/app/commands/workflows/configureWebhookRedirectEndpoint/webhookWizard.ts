/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ConfigureRedirectEndpointStep } from './ConfigureRedirectEndpointStep';
import { SaveWebhookContextStep } from './SaveWebhookContextStep';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureWizard } from '@microsoft/vscode-azext-utils';

export interface IWebhookContext extends IActionContext {
  redirectEndpoint: string;
}

export function createWebhookWizard(wizardContext: IWebhookContext, projectPath: string): AzureWizard<IWebhookContext> {
  return new AzureWizard(wizardContext, {
    promptSteps: [new ConfigureRedirectEndpointStep()],
    executeSteps: [new SaveWebhookContextStep(projectPath, wizardContext.redirectEndpoint)],
  });
}
