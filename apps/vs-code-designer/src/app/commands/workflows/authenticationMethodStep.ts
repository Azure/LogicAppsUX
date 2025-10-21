/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../localize';

export class AuthenticationMethod {
  static readonly RawKeys = 'rawKeys';
  static readonly ManagedServiceIdentity = 'managedServiceIdentity';
}

/**
 * Authentication method selection step
 * This step simply asks the user to choose between MSI and raw keys
 * and sets the ext.useMsi flag accordingly
 */
export class AuthenticationMethodSelectionStep<
  T extends IActionContext & { authenticationMethod?: string },
> extends AzureWizardPromptStep<T> {
  /**
   * Prompt the user to select authentication method
   */
  public async prompt(context: T): Promise<void> {
    const placeHolder: string = localize('selectAuthMethod', 'Select authentication method for Azure connectors');

    const picks: IAzureQuickPickItem<string>[] = [
      {
        label: localize('authMethodMSI', '$(shield) Managed Service Identity'),
        description: localize('authMethodMSIDesc', 'Use Azure Managed Identity'),
        detail: localize(
          'authMethodMSIDetail',
          'Authenticate using Azure Managed Service Identity. More secure, no keys stored locally. Requires proper Azure RBAC configuration'
        ),
        data: AuthenticationMethod.ManagedServiceIdentity,
      },
      {
        label: localize('authMethodRawKeys', '$(key) Connection Keys'),
        description: localize('authMethodRawKeysDesc', 'Use connection strings and access keys (traditional method)'),
        detail: localize(
          'authMethodRawKeysDetail',
          'Authenticate using connection strings, access keys, or API keys that will be configured in your settings'
        ),
        data: AuthenticationMethod.RawKeys,
      },
    ];

    const selectedMethod = await context.ui.showQuickPick(picks, {
      placeHolder,
      suppressPersistence: true,
      ignoreFocusOut: true,
    });

    // Store the selection in context
    context.authenticationMethod = selectedMethod.data;
  }

  /**
   * Determine if this step should be shown
   */
  public shouldPrompt(context: T): boolean {
    return context.authenticationMethod === undefined;
  }
}
