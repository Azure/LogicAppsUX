/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IProcessInfo } from '@microsoft/vscode-extension-logic-apps';

import processTree = require('process-tree');

/**
 * Gets windows process array with specific pid.
 * @returns {Promise<IProcessInfo[]>} Array of process.
 */
export async function getWindowsProcess(pid: number): Promise<IProcessInfo[]> {
  try {
    return await new Promise((resolve, reject): void => {
      processTree(pid, (err, children) => {
        if (err) {
          reject(err);
        }
        resolve(children);
      });
    });
  } catch (e) {
    return [];
  }
}
