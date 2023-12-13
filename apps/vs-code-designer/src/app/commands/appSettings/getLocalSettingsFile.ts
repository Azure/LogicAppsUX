/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName } from '../../../constants';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { selectWorkspaceFile } from '../../utils/workspace';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { WorkspaceFolder } from 'vscode';
import { workspace } from 'vscode';

/**
 * Returns local settings file path if exists and if only one project. Otherwise, prompts a dialog
 * @param {IActionContext} context - Command context.
 * @param {string} placeHolder - Placeholder for input.
 * @param {WorkspaceFolder} workspaceFolder - Workspace folder.
 * @returns {Promise<string>} Local settings file path.
 */
export async function getLocalSettingsFile(
  context: IActionContext,
  placeHolder: string,
  workspaceFolder?: WorkspaceFolder
): Promise<string> {
  workspaceFolder = workspaceFolder || workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder, true /* suppressPrompt */);
    if (projectPath) {
      const localSettingsFile: string = path.join(projectPath, localSettingsFileName);
      if (await fse.pathExists(localSettingsFile)) {
        return localSettingsFile;
      }
    }
  }

  return await selectWorkspaceFile(context, placeHolder, async (f: WorkspaceFolder): Promise<string> => {
    const projectPath: string = (await tryGetLogicAppProjectRoot(context, f, true /* suppressPrompt */)) || f.uri.fsPath;
    return path.relative(f.uri.fsPath, path.join(projectPath, localSettingsFileName));
  });
}
