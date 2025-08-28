/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';

/**
 * Represents a step in the logic app creation process that prompts the user for a password for file share authentication.
 */
export class PasswordStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  /**
   * Prompts the user for a password and sets the password in the wizard context.
   * @param {ILogicAppWizardContext} wizardContext The wizard context.
   */
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const passwordFileShare = await wizardContext.ui.showInputBox({
      placeHolder: localize('passwordFileShare', 'Password'),
      prompt: localize('passwordPrompt', 'Provide the password for File share authentication.'),
      password: true,
      validateInput: async (input: string): Promise<string | undefined> => await this.validatePassword(input),
    });

    wizardContext.fileShare.password = passwordFileShare;
  }

  /**
   * Determines whether this step should be prompted.
   * @returns True if this step should be prompted, false otherwise.
   */
  public shouldPrompt(): boolean {
    return true;
  }

  /**
   * Validates the password input.
   * @param {string | undefined} password The password input to validate.
   * @returns An error message if the password is invalid, undefined otherwise.
   */
  private async validatePassword(password: string | undefined): Promise<string | undefined> {
    if (!password) {
      return localize('emptyPasswordError', 'The password cannot be empty.');
    }
  }
}
