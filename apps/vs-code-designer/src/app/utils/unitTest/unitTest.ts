/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as path from 'path';
import { testsDirectoryName } from '../../../constants';

/**
 * Retrieves the tests directory for a given project path.
 * @param {string} projectPath - The path of the project.
 * @returns The tests directory as a `vscode.Uri` object.
 */
export const getTestsDirectory = (projectPath: string) => {
  const workspacePath = path.dirname(projectPath);
  const testsDirectory = vscode.Uri.file(path.join(workspacePath, testsDirectoryName));
  return testsDirectory;
};
