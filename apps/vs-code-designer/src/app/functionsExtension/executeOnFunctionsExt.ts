/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { functionsExtensionId } from '../../constants';
import { localize } from '../../localize';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { extensions } from 'vscode';

export async function executeOnFunctions(
  callback: (...args: any[]) => Promise<any>,
  context: IActionContext,
  ...args: any[]
): Promise<void> {
  const functionsExtension = extensions.getExtension(functionsExtensionId);

  if (functionsExtension?.isActive) {
    await callback(...args);
  } else {
    const message: string = localize('deactivatedFunctionsExt', 'Functions extension is deactivated, make sure to activate it');
    await context.ui.showWarningMessage(message);
  }
}
