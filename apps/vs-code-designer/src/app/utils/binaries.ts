/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DependencyVersion } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { executeCommand } from './funcCoreTools/cpUtils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as request from 'request';
import * as vscode from 'vscode';

/**
 * Download and Extracts Binaries zip.
 * @param {IActionContext} context - The context.
 * @param {string} binariesUrl - Binaries release url.
 * @param {string} targetFolder - Module name to check.
 */

export async function downloadAndExtractBinaries(binariesUrl: string, targetFolder: string, dependencyName: string): Promise<void> {
  const tempFolderPath = path.join(os.tmpdir(), '.azurelogicapps', dependencyName);
  targetFolder = path.join(targetFolder, dependencyName);
  fs.mkdirSync(targetFolder, { recursive: true });
  const zipFilePath = path.join(tempFolderPath, `${dependencyName}.zip`);

  try {
    executeCommand(ext.outputChannel, undefined, 'echo', `Creating temporary folder... ${tempFolderPath}`);
    fs.mkdirSync(tempFolderPath, { recursive: true });

    // Step 2: Download the zip
    await new Promise<void>((resolve, reject) => {
      executeCommand(ext.outputChannel, undefined, 'echo', `Donwloading binaries from: ${binariesUrl}}`);
      const downloadStream = request(binariesUrl).pipe(fs.createWriteStream(zipFilePath));
      downloadStream.on('finish', () => {
        executeCommand(ext.outputChannel, undefined, 'echo', `Successfullly downloaded ${dependencyName}.`);
        resolve();
      });
      downloadStream.on('error', reject);
    });

    // Step 3: Extract the zip to targetFolder
    executeCommand(ext.outputChannel, undefined, 'echo', `Extracting ${zipFilePath}`);
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(targetFolder, /* overwrite */ true);
    executeCommand(ext.outputChannel, undefined, 'echo', `Extraction completed successfully.`);

    vscode.window.showInformationMessage(`Successfully installed ${dependencyName}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Error downloading and extracting the zip: ${error.message}`);
    throw error;
  } finally {
    fs.rmdirSync(tempFolderPath, { recursive: true });
    executeCommand(ext.outputChannel, undefined, 'echo', `Removed ${tempFolderPath}`);
  }
}

export function getNewestFunctionRuntimeVersion(context: IActionContext): string {
  context.telemetry.properties.newestFunctionRuntimeVersion = 'true';
  // GET from cdn manifest, if fail --> fallback
  return DependencyVersion.funcCoreTools;
}

export function getFunctionCoreToolsBinariesReleaseUrl(version: string, osPlatform: string, arch: string): string {
  // https://github.com/Azure/azure-functions-core-tools/releases/download/4.0.5198/Azure.Functions.Cli.win-x64.4.0.5198.zip
  // https://github.com/Azure/azure-functions-core-tools/releases/download/4.0.5198/Azure.Functions.Cli.linux-x64.4.0.5198.zip
  // https://github.com/Azure/azure-functions-core-tools/releases/download/4.0.5198/Azure.Functions.Cli.osx-x64.4.0.5198.zip
  return `https://github.com/Azure/azure-functions-core-tools/releases/download/${version}/Azure.Functions.Cli.${osPlatform}-${arch}.${version}.zip`;
}

export function getDotNetBinariesReleaseUrl(version: string, osPlatform: string, arch: string): string {
  // https://dotnet.microsoft.com/en-us/download/dotnet/thank-you/sdk-6.0.412-windows-x64-binaries
  // https://dotnet.microsoft.com/en-us/download/dotnet/thank-you/sdk-6.0.412-linux-x64-binaries
  // https://dotnet.microsoft.com/en-us/download/dotnet/thank-you/sdk-6.0.412-macos-x64-binaries
  return `https://dotnet.microsoft.com/en-us/download/dotnet/thank-you/sdk-${version}-${osPlatform}-${arch}-binaries`;
}

export function getCpuArchitecture() {
  switch (process.arch) {
    case 'x64':
    case 'arm64':
      return process.arch;

    default:
      throw new Error(localize('UnsupportedCPUArchitecture', `Unsupported CPU Architecture: ${process.arch}`));
  }
}
