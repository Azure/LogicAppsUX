/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../localize';

/**
 * String literal union for supported authentication methods.
 * This replaces the enum for simpler runtime footprint.
 */
export type AuthenticationMethodType = 'managedServiceIdentity' | 'rawKeys';

/**
 * Authentication method selection step
 * This step prompts the user to select between MSI and raw keys
 * and sets the `authenticationMethod` in the context.
 */
export class AuthenticationMethodSelectionStep<
  T extends IActionContext & { authenticationMethod?: AuthenticationMethodType },
> extends AzureWizardPromptStep<T> {
  /**
   * Prompts the user to select an authentication method.
   * The result is stored in `context.authenticationMethod`.
   */
  public async prompt(context: T): Promise<void> {
    const placeHolder: string = localize('selectAuthMethod', 'Select authentication method for Azure connectors');

    const picks: IAzureQuickPickItem<AuthenticationMethodType>[] = [
      {
        label: localize('authMethodMSI', '$(shield) Managed Service Identity'),
        description: localize('authMethodMSIDesc', 'Use Azure Managed Identity'),
        detail: localize(
          'authMethodMSIDetail',
          'Authenticate using Azure Managed Service Identity. More secure, no keys stored locally. Requires proper Azure RBAC configuration.'
        ),
        data: 'managedServiceIdentity',
      },
      {
        label: localize('authMethodRawKeys', '$(key) Connection Keys'),
        description: localize('authMethodRawKeysDesc', 'Use connection strings and access keys (traditional method)'),
        detail: localize(
          'authMethodRawKeysDetail',
          'Authenticate using connection strings, access keys, or API keys configured in your app settings.'
        ),
        data: 'rawKeys',
      },
    ];

    const selectedMethod = await context.ui.showQuickPick(picks, {
      placeHolder,
      suppressPersistence: true,
      ignoreFocusOut: true,
    });

    // Save the selected authentication method
    context.authenticationMethod = selectedMethod.data;
  }

  /**
   * Determines if this step should prompt again (only if no method is selected yet).
   */
  public shouldPrompt(): boolean {
    return true;
  }
}
