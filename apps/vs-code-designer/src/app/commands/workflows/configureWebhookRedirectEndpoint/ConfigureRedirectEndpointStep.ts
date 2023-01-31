/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import type { IWebhookContext } from './webhookWizard';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { window } from 'vscode';

export class ConfigureRedirectEndpointStep extends AzureWizardPromptStep<IWebhookContext> {
  public async prompt(context: IWebhookContext): Promise<void> {
    try {
      context.redirectEndpoint = await context.ui.showInputBox({
        placeHolder: localize('configureWebhookEndpointPlaceholder', 'Host endpoint'),
        prompt: localize('configureWebhookEndpointPrompt', 'Configure host for remote endpoint for webhook operations'),
        value: context.redirectEndpoint,
      });
      window.showInformationMessage(
        localize('logicapp.webhookConfigured', 'Host for webhook redirect endpoint is configured successfully for local workflows.')
      );
    } catch {
      window.showInformationMessage(
        localize(
          'logicapp.webhookNotConfigured',
          'Redirect endpoint for webhook is not configured. Webhook actions will not work as expected'
        ),
        'OK'
      );
    }
  }

  public shouldPrompt(): boolean {
    return true;
  }
}
