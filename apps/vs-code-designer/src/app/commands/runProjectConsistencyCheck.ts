/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ensureProjectFiles } from '../projectConsistency/projectFilesConsistency';
import { ensureVSCodeFiles } from '../projectConsistency/vscodeConsistency';
import * as vscode from 'vscode';
import { getWorkspaceLogicAppRoots } from '../utils/workspace';
import { type EnsureVSCodeFilesOrigin, recordRegenerationEvent } from '../utils/regenerationProbe';

export async function runProjectConsistencyCheck(
  context: IActionContext,
  origin: EnsureVSCodeFilesOrigin = 'explicit-consistency-command'
): Promise<void> {
  recordRegenerationEvent({ event: 'consistency-check-entered' });
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    recordRegenerationEvent({ event: 'consistency-check-skipped', reason: 'no-workspace' });
    return;
  }
  const projectPaths = await getWorkspaceLogicAppRoots();
  recordRegenerationEvent({ event: 'consistency-project-discovery-returned', projectCount: projectPaths.length });

  const ensureProjectFilesTasks = projectPaths.map((projectPath) => ensureProjectFiles(context, projectPath));
  const ensureVSCodeFilesTask = ensureVSCodeFiles(context, projectPaths, origin);

  await Promise.all([...ensureProjectFilesTasks, ensureVSCodeFilesTask]);
  recordRegenerationEvent({ event: 'consistency-check-returned' });
}
