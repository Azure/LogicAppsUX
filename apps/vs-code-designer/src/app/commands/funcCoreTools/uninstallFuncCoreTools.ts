/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { functionsCommand } from '../../../constants';
import type { PackageManager } from '../../../constants';
import { commands } from 'vscode';

export async function uninstallFuncCoreTools(packageManagers?: PackageManager[]): Promise<void> {
  await commands.executeCommand(functionsCommand.azureFunctionsUninstallFuncCoreTools, packageManagers);
}
