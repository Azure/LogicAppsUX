/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import { getCoreNodeModule } from './getCoreNodeModule';
import type { IWindowsProcessTree } from '@microsoft/vscode-extension';

/**
 * Gets windows process tree module.
 * @returns {IWindowsProcessTree} Windows module.
 */
export function getWindowsProcessTree(): IWindowsProcessTree {
  const moduleName = 'windows-process-tree';
  const windowsProcessTree: IWindowsProcessTree | undefined = getCoreNodeModule<IWindowsProcessTree>(moduleName);
  if (!windowsProcessTree) {
    throw new Error(localize('noWindowsProcessTree', 'Failed to find dependency "{0}".', moduleName));
  }
  return windowsProcessTree;
}
