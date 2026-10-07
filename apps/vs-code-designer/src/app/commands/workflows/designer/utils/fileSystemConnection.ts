/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { FileSystemConnectionInfo } from '@microsoft/vscode-extension-logic-apps';
import { execFile } from 'child_process';
import { platform } from 'os';
import * as path from 'path';
import { localize } from '../../../../../localize';
import { getExtensionAssetPath } from '../../../../utils/extensionAssets';

interface FileSystemConnectionResult {
  connection?: FileSystemConnectionInfo;
  errorMessage?: string;
}

function getConnectionErrorMessage(status?: string): string {
  switch (status) {
    case '5':
    case '86':
    case '1326':
    case '2202':
      return localize(
        'fileSystemConnectionAccessDenied',
        'Access to the SMB share was denied. Check the credentials and share permissions.'
      );
    case '1219':
      return localize(
        'fileSystemConnectionCredentialConflict',
        'A connection to this server already exists with different credentials. Disconnect it before trying again.'
      );
    case '53':
    case '67':
    case '1231':
      return localize(
        'fileSystemConnectionShareUnavailable',
        'The SMB share could not be reached. Check the root folder and network connection.'
      );
    default:
      return localize(
        'fileSystemConnectionFailed',
        'Unable to create the file system connection. Check the SMB share and credentials, and ensure Windows PowerShell is available.'
      );
  }
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
    // Raw process errors and output must never cross this boundary into webview telemetry.
    const fail = () => resolve({ errorMessage: getConnectionErrorMessage() });

    try {
      const systemRoot = process.env.SystemRoot;
      if (!systemRoot) {
        fail();
        return;
      }

      const child = execFile(
        path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
        [
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          getExtensionAssetPath('scripts', 'connect-smb-share.ps1'),
        ],
        { encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000, maxBuffer: 1024 },
        (error, stdout) => {
          if (error) {
            fail();
          } else if (stdout.trim() === '0') {
            resolve({
              connection: {
                ...connectionInfo,
                connectionParameters: { mountPath: rootFolder },
              },
            });
          } else {
            resolve({ errorMessage: getConnectionErrorMessage(stdout.trim()) });
          }
        }
      );

      if (!child.stdin) {
        fail();
        return;
      }

      child.stdin.on('error', fail);
      child.stdin.end(JSON.stringify({ rootFolder, username, password }), 'utf8');
    } catch {
      fail();
    }
  });
}
