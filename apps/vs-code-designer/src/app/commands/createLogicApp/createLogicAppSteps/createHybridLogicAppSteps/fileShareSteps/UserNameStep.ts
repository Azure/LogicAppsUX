/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';

/**
 * Represents a step in the logic app creation process for providing the user name for File share authentication.
 */
export class UserNameStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  /**
   * Prompts the user to enter the user name for File share authentication.
   * @param {ILogicAppWizardContext} wizardContext The wizard context.
   */
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const userName = await wizardContext.ui.showInputBox({
      placeHolder: localize('userNameFileShare', 'User name'),
      prompt: localize('userNamePrompt', 'Provide the user name for File share authentication.'),
      validateInput: async (input: string): Promise<string | undefined> => await this.validateUserName(input),
    });

    wizardContext.fileShare.userName = userName;
  }

  /**
   * Determines whether this step should be prompted.
   * @returns A boolean indicating whether this step should be prompted.
   */
  public shouldPrompt(): boolean {
    return true;
  }

  /**
   * Validates the user name input.
   * @param {string | undefined} userName The user name input.
   * @returns An error message if the user name is invalid, otherwise undefined.
   */
  private async validateUserName(userName: string | undefined): Promise<string | undefined> {
    if (!userName) {
      return localize('emptyUserNameError', 'The user name cannot be empty.');
    }
  }
}
