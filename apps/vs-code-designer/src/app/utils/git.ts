/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { gitCommand } from '../../constants';
import { ext } from '../../extensionVariables';
import { executeCommand } from './funcCoreTools/cpUtils';

export async function isGitInstalled(workingDirectory: string): Promise<boolean> {
  try {
    await executeCommand(undefined, workingDirectory, gitCommand, '--version');
    return true;
  } catch (error) {
    return false;
  }
}

export async function gitInit(workingDirectory: string): Promise<void> {
  await executeCommand(ext.outputChannel, workingDirectory, gitCommand, 'init');
}

export async function isInsideRepo(workingDirectory: string): Promise<boolean> {
  try {
    await executeCommand(undefined, workingDirectory, gitCommand, 'rev-parse', '--git-dir');
    return true;
  } catch (error) {
    return false;
  }
}
