/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { FileSystemConnectionInfo } from '@microsoft/vscode-extension-logic-apps';
import { exec } from 'child_process';

/**
 * Creates a file system connection by mapping a network drive via `net use`.
 */
export function createFileSystemConnection(connectionInfo: FileSystemConnectionInfo): Promise<any> {
  const rootFolder = connectionInfo.connectionParameters?.['rootFolder'];
  const username = connectionInfo.connectionParameters?.['username'];
  const password = connectionInfo.connectionParameters?.['password'];

  return new Promise((resolve) => {
    exec(`net use ${rootFolder} ${password} /user:${username}`, (error) => {
      if (error) {
        resolve({ errorMessage: JSON.stringify(error.message) });
      } else {
        resolve({
          connection: {
            ...connectionInfo,
            connectionParameters: { mountPath: rootFolder },
          },
        });
      }
    });
  });
}
