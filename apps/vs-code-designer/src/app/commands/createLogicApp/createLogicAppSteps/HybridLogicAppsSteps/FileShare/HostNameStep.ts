/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';

/**
 * Represents a step in the logic app creation process for specifying the host name or IP address of the SMB server.
 */
export class HostNameStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  /**
   * Prompts the user to enter the host name or IP address of the SMB server.
   * @param {ILogicAppWizardContext} wizardContext The wizard context.
   */
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const hostName = await wizardContext.ui.showInputBox({
      placeHolder: localize('hostNameSMB', 'SMB Host name / IP address'),
      prompt: localize('hostNamePrompt', 'Provide the host name or the IP address of the SMB server.'),
      validateInput: async (input: string): Promise<string | undefined> => await this.validateHostName(input),
    });

    wizardContext.fileShare.hostName = hostName;
  }

  /**
   * Determines whether this step should be prompted.
   * @returns A boolean indicating whether this step should be prompted.
   */
  public shouldPrompt(): boolean {
    return true;
  }

  /**
   * Validates the host name or IP address.
   * @param {string | undefined} hostName The host name or IP address to validate.
   * @returns An error message if the host name or IP address is invalid, otherwise undefined.
   */
  private async validateHostName(hostName: string | undefined): Promise<string | undefined> {
    if (!hostName) {
      return localize('emptyHostNameError', 'The host name / IP address cannot be empty.');
    }
  }
}
