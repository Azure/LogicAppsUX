/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import { isEmptyString } from '@microsoft/utils-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import type { pathRelativeFunc } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { MessageItem } from 'vscode';

/**
 * Writes data to file in json format
 * @param {string} fsPath - File path to write
 * @param {object} data - Data to bew written
 */
export async function writeFormattedJson(fsPath: string, data: object): Promise<void> {
  await fse.writeJson(fsPath, data, { spaces: 2 });
}

/**
 * Checks if folders/files have same path
 * @param {string} fsPath1 - Folder/file path.
 * @param {string} fsPath2 - Folder/file path.
 * @param {pathRelativeFunc} relativeFunc - Workflow file path.
 * @returns {boolean} True if folder/file have the same path
 */
export function isPathEqual(fsPath1: string, fsPath2: string, relativeFunc: pathRelativeFunc = path.relative): boolean {
  const relativePath: string = relativeFunc(fsPath1, fsPath2);
  return isEmptyString(relativePath);
}

/**
 * Checks if folder/file is subpath from another one.
 * @param {string} expectedParent - Parent folder/file path.
 * @param {string} expectedChild - Child folder/file path.
 * @param {pathRelativeFunc} relativeFunc - Workflow file path.
 * @returns {boolean} True if folder/file is subpath.
 */
export function isSubpath(expectedParent: string, expectedChild: string, relativeFunc: pathRelativeFunc = path.relative): boolean {
  const relativePath: string = relativeFunc(expectedParent, expectedChild);
  return !isEmptyString(relativePath) && !relativePath.startsWith('..') && relativePath !== expectedChild;
}

export async function confirmOverwriteFile(context: IActionContext, fsPath: string): Promise<boolean> {
  if (await fse.pathExists(fsPath)) {
    const result: MessageItem | undefined = await context.ui.showWarningMessage(
      localize('fileAlreadyExists', 'File "{0}" already exists. Overwrite?', fsPath),
      { modal: true },
      DialogResponses.yes,
      DialogResponses.no,
      DialogResponses.cancel
    );
    if (result === DialogResponses.yes) {
      return true;
    } else {
      return false;
    }
  } else {
    return true;
  }
}

export async function confirmEditJsonFile(
  context: IActionContext,
  fsPath: string,
  editJson: (existingData: Record<string, any>) => Record<string, any>
): Promise<void> {
  let newData: Record<string, any>;
  if (await fse.pathExists(fsPath)) {
    try {
      newData = editJson((await fse.readJson(fsPath)) as Record<string, any>);
    } catch (error) {
      // If we failed to parse or edit the existing file, just ask to overwrite the file completely
      if (await confirmOverwriteFile(context, fsPath)) {
        newData = editJson({});
      } else {
        return;
      }
    }
  } else {
    newData = editJson({});
  }

  await writeFormattedJson(fsPath, newData);
}
