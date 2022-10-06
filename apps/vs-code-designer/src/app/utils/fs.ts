/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as crypto from 'crypto';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { MessageItem } from 'vscode';

export async function writeFormattedJson(fsPath: string, data: object): Promise<void> {
  await fse.writeJson(fsPath, data, { spaces: 2 });
}

export async function copyFolder(context: IActionContext, fromPath: string, toPath: string): Promise<void> {
  const files: string[] = await fse.readdir(fromPath);
  for (const file of files) {
    const originPath: string = path.join(fromPath, file);
    const stat: fse.Stats = await fse.stat(originPath);
    const targetPath: string = path.join(toPath, file);
    if (stat.isFile()) {
      if (await confirmOverwriteFile(context, targetPath)) {
        await fse.copy(originPath, targetPath, { overwrite: true });
      }
    } else if (stat.isDirectory()) {
      await copyFolder(context, originPath, targetPath);
    }
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

export function getRandomHexString(length = 10): string {
  const buffer: Buffer = crypto.randomBytes(Math.ceil(length / 2));
  return buffer.toString('hex').slice(0, length);
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
