/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { window } from 'vscode';

export async function parameterizeConnections(_context: IActionContext, _fsPath?: any, _language?: any): Promise<void> {
  window.showInformationMessage(localize('finishedInitializing', 'Finished initializing for use with VS Code.'));
}
