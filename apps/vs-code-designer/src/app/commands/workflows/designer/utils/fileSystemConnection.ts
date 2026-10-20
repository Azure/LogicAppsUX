/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { FileSystemConnectionInfo } from '@microsoft/vscode-extension-logic-apps';
import { spawn } from 'child_process';
import { platform } from 'os';
import * as path from 'path';
import { localize } from '../../../../../localize';

interface FileSystemConnectionResult {
  connection?: FileSystemConnectionInfo;
  errorMessage: string;
}

export function createFileSystemConnection(connectionInfo: FileSystemConnectionInfo): Promise<FileSystemConnectionResult> {
  const rootFolder = connectionInfo.connectionParameters?.['rootFolder'];
  const username = connectionInfo.connectionParameters?.['username'];
  const password = connectionInfo.connectionParameters?.['password'];

  if (platform() !== 'win32') {
    return Promise.resolve({
      errorMessage: localize('fileSystemConnectionWindowsOnly', 'File system connections to SMB shares are supported only on Windows.'),
    });
  }

  if (
    typeof rootFolder !== 'string' ||
    !rootFolder.startsWith('\\\\') ||
    typeof username !== 'string' ||
    username.length === 0 ||
    typeof password !== 'string' ||
    [rootFolder, username, password].some((value) => value.includes('\0'))
  ) {
    return Promise.resolve({
      errorMessage: localize(
        'fileSystemConnectionInvalidParameters',
        'Provide a valid UNC root folder, username, and password for the SMB share.'
      ),
    });
  }

  return new Promise((resolve) => {
    // Process errors can contain credentials in spawnargs; never forward them to webview telemetry.
    const fail = () =>
      resolve({
        errorMessage: localize(
          'fileSystemConnectionFailed',
          'Unable to create the file system connection. Check the SMB share, credentials, network access, and existing connections.'
        ),
      });

    try {
      const systemRoot = process.env.SystemRoot;
      if (!systemRoot) {
        fail();
        return;
      }

      const child = spawn(path.join(systemRoot, 'System32', 'net.exe'), ['use', rootFolder, password, `/user:${username}`], {
        shell: false,
        windowsHide: true,
        stdio: 'ignore',
      });
      child.on('error', fail);
      child.once('close', (code: number | null, signal: NodeJS.Signals | null) => {
        if (code !== 0 || signal) {
          fail();
        } else {
          resolve({
            errorMessage: '',
            connection: {
              ...connectionInfo,
              connectionParameters: { mountPath: rootFolder },
            },
          });
        }
      });
    } catch {
      fail();
    }
  });
}
