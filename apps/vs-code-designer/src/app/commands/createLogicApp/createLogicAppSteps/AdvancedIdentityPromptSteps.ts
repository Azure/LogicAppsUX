/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IIdentityWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class AdvancedIdentityObjectIdStep extends AzureWizardPromptStep<IIdentityWizardContext> {
  public async prompt(wizardContext: IIdentityWizardContext): Promise<void> {
    const prompt: string = localize('objectIdPrompt', 'Enter the object ID for your AAD identity.');
    wizardContext.objectId = await wizardContext.ui.showInputBox({ prompt });
  }

  public shouldPrompt(wizardContext: IIdentityWizardContext): boolean {
    return wizardContext.objectId === undefined;
  }
}

export class AdvancedIdentityClientIdStep extends AzureWizardPromptStep<IIdentityWizardContext> {
  public async prompt(wizardContext: IIdentityWizardContext): Promise<void> {
    const prompt: string = localize('clientIdPrompt', 'Enter the client ID for your AAD identity.');
    wizardContext.clientId = await wizardContext.ui.showInputBox({ prompt });
  }

  public shouldPrompt(wizardContext: IIdentityWizardContext): boolean {
    return wizardContext.clientId === undefined;
  }
}

export class AdvancedIdentityTenantIdStep extends AzureWizardPromptStep<IIdentityWizardContext> {
  public async prompt(wizardContext: IIdentityWizardContext): Promise<void> {
    const prompt: string = localize('tenantIdPrompt', 'Enter the tenant ID for your AAD identity.');
    wizardContext.tenantId = await wizardContext.ui.showInputBox({ prompt });
  }

  public shouldPrompt(wizardContext: IIdentityWizardContext): boolean {
    return wizardContext.tenantId === undefined;
  }
}

export class AdvancedIdentityClientSecretStep extends AzureWizardPromptStep<IIdentityWizardContext> {
  public async prompt(wizardContext: IIdentityWizardContext): Promise<void> {
    const prompt: string = localize('clientSecretPrompt', 'Enter the client secret for your AAD identity.');
    wizardContext.clientSecret = await wizardContext.ui.showInputBox({ prompt });
  }

  public shouldPrompt(wizardContext: IIdentityWizardContext): boolean {
    return wizardContext.clientSecret === undefined;
  }
}
