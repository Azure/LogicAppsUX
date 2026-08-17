/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { FileSystemConnectionInfo } from '@microsoft/vscode-extension-logic-apps';
import { spawn } from 'child_process';
import { win32 as path } from 'path';

const FILE_SYSTEM_CONNECTION_ERROR = 'Unable to connect to the file system. Verify the connection details and try again.';

const CONNECT_FILE_SYSTEM_SCRIPT = `
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class NetworkConnection
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct NETRESOURCE
    {
        public int dwScope;
        public int dwType;
        public int dwDisplayType;
        public int dwUsage;
        public string lpLocalName;
        public string lpRemoteName;
        public string lpComment;
        public string lpProvider;
    }

    [DllImport("mpr.dll", EntryPoint = "WNetAddConnection2W", CharSet = CharSet.Unicode)]
    public static extern int WNetAddConnection2(
        ref NETRESOURCE netResource,
        string password,
        string username,
        int flags);
}
'@

$inputStream = [Console]::OpenStandardInput()
$reader = [System.IO.StreamReader]::new($inputStream, [System.Text.Encoding]::UTF8)
$connection = $reader.ReadToEnd() | ConvertFrom-Json

$resource = [NetworkConnection+NETRESOURCE]::new()
$resource.dwType = 1
$resource.lpRemoteName = [string]$connection.rootFolder

$result = [NetworkConnection]::WNetAddConnection2(
    [ref]$resource,
    [string]$connection.password,
    [string]$connection.username,
    0)

if ($result -ne 0) {
    exit 1
}
`;

const ENCODED_CONNECT_FILE_SYSTEM_SCRIPT = Buffer.from(CONNECT_FILE_SYSTEM_SCRIPT, 'utf16le').toString('base64');

interface FileSystemConnectionResult {
  connection?: FileSystemConnectionInfo;
  errorMessage?: string;
}

/**
 * Creates a file system connection without exposing credentials in process arguments or errors.
 */
export function createFileSystemConnection(connectionInfo: FileSystemConnectionInfo): Promise<FileSystemConnectionResult> {
  const rootFolder = connectionInfo.connectionParameters?.['rootFolder'];
  const username = connectionInfo.connectionParameters?.['username'];
  const password = connectionInfo.connectionParameters?.['password'];
  const systemRoot = process.env['SystemRoot'];

  if (
    typeof rootFolder !== 'string' ||
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    typeof systemRoot !== 'string' ||
    !/^[A-Za-z]:\\/.test(systemRoot) ||
    !path.isAbsolute(systemRoot)
  ) {
    return Promise.resolve({ errorMessage: FILE_SYSTEM_CONNECTION_ERROR });
  }

  return new Promise((resolve) => {
    const childProcess = spawn(
      path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', ENCODED_CONNECT_FILE_SYSTEM_SCRIPT],
      {
        shell: false,
        stdio: ['pipe', 'ignore', 'ignore'],
        windowsHide: true,
      }
    );
    let settled = false;

    const finish = (succeeded: boolean): void => {
      if (settled) {
        return;
      }

      settled = true;
      if (succeeded) {
        resolve({
          connection: {
            ...connectionInfo,
            connectionParameters: { mountPath: rootFolder },
          },
        });
      } else {
        resolve({ errorMessage: FILE_SYSTEM_CONNECTION_ERROR });
      }
    };

    childProcess.once('error', () => finish(false));
    childProcess.once('close', (exitCode) => finish(exitCode === 0));
    childProcess.stdin.once('error', () => finish(false));
    childProcess.stdin.end(JSON.stringify({ rootFolder, username, password }), 'utf8');
  });
}
