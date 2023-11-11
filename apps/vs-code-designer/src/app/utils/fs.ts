/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import { isEmptyString } from '@microsoft/logic-apps-designer';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import type { pathRelativeFunc } from '@microsoft/vscode-extension';
import * as crypto from 'crypto';
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

/**
 * Displays warning message to select if desire to overwrite file.
 * @param {IActionContext} context - Command context.
 * @param {string} fsPath - File path.
 * @param {string} message - Message.
 * @returns {Promise<boolean>} True if user wants to overwrite file.
 */
export async function confirmOverwriteFile(context: IActionContext, fsPath: string, message?: string): Promise<boolean> {
  if (await fse.pathExists(fsPath)) {
    const result: MessageItem | undefined = await context.ui.showWarningMessage(
      localize('fileAlreadyExists', message ?? 'File "{0}" already exists. Overwrite?', fsPath),
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

/**
 * Gets a random hex string of specific length.
 * @param {number} length - Command context.
 * @returns {string} Random hex string.
 */
export function getRandomHexString(length = 10): string {
  const buffer: Buffer = crypto.randomBytes(Math.ceil(length / 2));
  return buffer.toString('hex').slice(0, length);
}

/**
 * If file exists waits for confirmation to update it, otherwise creates a new json file.
 * @param {IActionContext} context - Command context.
 * @param {string} fsPath - File path.
 * @param {Function} editJson - Function to edit the json file.
 */
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
