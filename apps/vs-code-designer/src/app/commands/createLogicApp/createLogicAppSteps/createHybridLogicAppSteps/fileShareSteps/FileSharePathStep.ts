/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';

/**
 * Represents a step in the logic app creation process for specifying the file share path.
 */
export class FileSharePathStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  /**
   * Prompts the user to provide the path of the SMB file share.
   * @param wizardContext The wizard context.
   */
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const fileSharePath = await wizardContext.ui.showInputBox({
      placeHolder: localize('fileSharePath', 'File share path'),
      prompt: localize('fileSharePathPrompt', 'Provide the path of the SMB file share.'),
      validateInput: async (input: string): Promise<string | undefined> => await this.validateFileSharePath(input),
    });

    wizardContext.fileShare.path = fileSharePath;
  }

  /**
   * Determines whether this step should be prompted.
   * @returns A boolean indicating whether this step should be prompted.
   */
  public shouldPrompt(): boolean {
    return true;
  }

  /**
   * Validates the file share path input.
   * @param fileSharePath The file share path to validate.
   * @returns An error message if the file share path is invalid, otherwise undefined.
   */
  private async validateFileSharePath(fileSharePath: string | undefined): Promise<string | undefined> {
    if (!fileSharePath) {
      return localize('emptyFileSharePathError', 'The file share path cannot be empty.');
    }
  }
}
