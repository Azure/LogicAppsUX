/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { type QuickPickItem, type QuickPickOptions, window } from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { updateGlobalSetting } from '../utils/vsCodeConfig/settings';
import { DesignerVersion } from '@microsoft/vscode-extension-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

/**
 * Switches the Logic Apps designer version between available options.
 * Prompts the user to select a designer version and updates the global settings.
 *
 * @param context - The action context containing UI interaction methods
 * @returns A promise that resolves when the designer version has been successfully updated
 * @throws {Error} When the designer version update fails or the user cancels the selection
 */
export async function switchDesignerVersion(context: IActionContext): Promise<void> {
  try {
    const designerVersionPicks: QuickPickItem[] = [{ label: DesignerVersion.v1 }, { label: DesignerVersion.v2 }];

    const options: QuickPickOptions = { placeHolder: localize('designerVersion', 'Select designer version') };
    const updatedDesignerVersion = (await context.ui.showQuickPick(designerVersionPicks, options)).label;

    await updateGlobalSetting('designerVersion', updatedDesignerVersion);
    window.showInformationMessage(localize('updateDesignerVersion', 'Designer version has been updated to {0}', updatedDesignerVersion));
  } catch (error) {
    const errorMessage = localize('failedToUpdateDesignerVersion', 'Failed to update designer version: {0}', error.message ?? error);
    ext.outputChannel.appendLog(errorMessage);
    throw new Error(errorMessage);
  }
}
