/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { functionsExtensionId } from '../../constants';
import { extensions } from 'vscode';

export async function executeOnFunctions(callback, ...args: any[]): Promise<void> {
  const functionsExtension = extensions.getExtension(functionsExtensionId);

  if (functionsExtension?.isActive) {
    callback(...args);
  }
}
