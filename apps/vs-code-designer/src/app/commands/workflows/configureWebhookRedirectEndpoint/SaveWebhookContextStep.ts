/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { webhookRedirectHostUri } from '../../../../constants';
import { addOrUpdateLocalAppSettings } from '../../../utils/appSettings/localSettings';
import type { IWebhookContext } from './webhookWizard';
import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { Progress } from 'vscode';

export class SaveWebhookContextStep extends AzureWizardExecuteStep<IWebhookContext> {
  public priority = 10;
  private projectPath: string;
  private originalRedirectEndpoint: string;

  constructor(projectPath: string, originalRedirectEndpoint: string) {
    super();
    this.projectPath = projectPath;
    this.originalRedirectEndpoint = originalRedirectEndpoint;
  }

  public async execute(
    context: IWebhookContext,
    _progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void> {
    const { redirectEndpoint } = context;
    if (this.originalRedirectEndpoint !== redirectEndpoint) {
      await addOrUpdateLocalAppSettings(context, this.projectPath, { [webhookRedirectHostUri]: redirectEndpoint });
    }
  }

  public shouldExecute(): boolean {
    return true;
  }
}
