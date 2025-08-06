/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { gitCommand, gitignoreFileName } from '../../constants';
import { ext } from '../../extensionVariables';
import { executeCommand } from './funcCoreTools/cpUtils';
import * as path from 'path';
import * as fse from 'fs-extra';

/**
 * Checks if git is installed.
 * @param {string} workingDirectory - Workspace path.
 * @returns {Promise<boolean>} Returns true if git is installed.
 */
export async function isGitInstalled(workingDirectory: string): Promise<boolean> {
  try {
    await executeCommand(undefined, workingDirectory, gitCommand, '--version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Initializes git in working directory.
 * @param {string} workingDirectory - Workspace path.
 */
export async function gitInit(workingDirectory: string): Promise<void> {
  await executeCommand(ext.outputChannel, workingDirectory, gitCommand, 'init');
}

/**
 * Checks if git is inside repo.
 * @param {string} workingDirectory - Workspace path.
 * @returns {Promise<boolean>} Returns true if git is inside repo.
 */
export async function isInsideRepo(workingDirectory: string): Promise<boolean> {
  try {
    await executeCommand(undefined, workingDirectory, gitCommand, 'rev-parse', '--git-dir');
    return true;
  } catch {
    return false;
  }
}

export const removeFromGitIgnore = async (workspacePath: string, pattern: RegExp) => {
  const gitignorePath: string = path.join(workspacePath, gitignoreFileName);
  if (await fse.pathExists(gitignorePath)) {
    let gitignoreContents: string = (await fse.readFile(gitignorePath)).toString();
    gitignoreContents = gitignoreContents.replace(pattern, '');
    await fse.writeFile(gitignorePath, gitignoreContents);
  }
};

export const getGitIgnoreContent = () => {
  return `
# Azure logic apps artifacts
bin
obj
appsettings.json
local.settings.json
__blobstorage__
.debug
__queuestorage__
__azurite_db*__.json

# Added folders and file patterns
workflow-designtime/
.vscode/
*.code-workspace`;
};
