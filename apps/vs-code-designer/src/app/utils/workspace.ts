/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fsUtils from './fs';
import * as globby from 'globby';
import * as path from 'path';
import * as vscode from 'vscode';

export function getContainingWorkspace(fsPath: string): vscode.WorkspaceFolder | undefined {
  // tslint:disable-next-line:strict-boolean-expressions
  const openFolders = vscode.workspace.workspaceFolders || [];
  return openFolders.find((f: vscode.WorkspaceFolder): boolean => {
    return fsUtils.isPathEqual(f.uri.fsPath, fsPath) || fsUtils.isSubpath(f.uri.fsPath, fsPath);
  });
}

export const getWorkflowNode = (node: vscode.Uri | undefined): vscode.Uri | undefined => {
  if (node === undefined) {
    const activeFile = vscode?.window?.activeTextEditor?.document;
    if (activeFile?.fileName.endsWith('workflow.json')) {
      return activeFile.uri;
    }
  }

  return node;
};

/**
 * Alternative to `vscode.workspace.findFiles` which always returns an empty array if no workspace is open
 */
export async function findFiles(base: vscode.WorkspaceFolder | string, pattern: string): Promise<vscode.Uri[]> {
  // Per globby docs: "Note that glob patterns can only contain forward-slashes, not backward-slashes, so if you want to construct a glob pattern from path components, you need to use path.posix.join() instead of path.join()"
  const posixBase = path.posix.normalize(typeof base === 'string' ? base : base.uri.fsPath).replace(/\\/g, '/');
  const escapedBase = escapeCharacters(posixBase);
  const fullPattern = path.posix.join(escapedBase, pattern);
  return (await globby(fullPattern)).map((s) => vscode.Uri.file(s));
}

function escapeCharacters(nonPattern: string): string {
  return nonPattern.replace(/[$^*+?()[\]]/g, '\\$&');
}
