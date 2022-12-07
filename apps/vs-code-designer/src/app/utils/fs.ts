/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { pathRelativeFunc } from './models';
import { isEmptyString } from '@microsoft/utils-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';

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
