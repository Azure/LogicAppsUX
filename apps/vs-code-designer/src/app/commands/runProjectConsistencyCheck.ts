/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ensureProjectFiles } from '../projectConsistency/projectFilesConsistency';
import { ensureVSCodeFiles } from '../projectConsistency/vscodeConsistency';
import * as vscode from 'vscode';
import { getLogicAppRoots } from '../utils/workspace';

export async function runProjectConsistencyCheck(context: IActionContext): Promise<void> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return;
  }
  const projectPaths = await getLogicAppRoots();

  const ensureProjectFilesTasks = projectPaths.map((projectPath) => ensureProjectFiles(context, projectPath));
  const ensureVSCodeFilesTask = ensureVSCodeFiles(context, projectPaths);

  await Promise.all([...ensureProjectFilesTasks, ensureVSCodeFilesTask]);
}
