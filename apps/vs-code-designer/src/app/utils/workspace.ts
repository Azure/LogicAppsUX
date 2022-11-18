/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fsUtils from './fs';
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
