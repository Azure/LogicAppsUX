/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fse from 'fs-extra';
import * as path from 'path';

export async function writeFormattedJson(fsPath: string, data: object): Promise<void> {
  await fse.writeJson(fsPath, data, { spaces: 2 });
}

export function isPathEqual(fsPath1: string, fsPath2: string, relativeFunc: pathRelativeFunc = path.relative): boolean {
  const relativePath: string = relativeFunc(fsPath1, fsPath2);
  return relativePath === '';
}

export function isSubpath(expectedParent: string, expectedChild: string, relativeFunc: pathRelativeFunc = path.relative): boolean {
  const relativePath: string = relativeFunc(expectedParent, expectedChild);
  return relativePath !== '' && !relativePath.startsWith('..') && relativePath !== expectedChild;
}

type pathRelativeFunc = (fsPath1: string, fsPath2: string) => string;
