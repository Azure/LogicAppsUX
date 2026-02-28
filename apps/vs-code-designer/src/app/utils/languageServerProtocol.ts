import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import path from 'path';
import * as fse from 'fs-extra';
import { autoRuntimeDependenciesPathSettingKey, assetsFolderName, lspDirectory } from '../../constants';
import { getGlobalSetting } from './vsCodeConfig/settings';
import AdmZip from 'adm-zip';

export async function installLSPSDK(): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.installLSPSDK', async () => {
    const targetDirectory = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
    await fse.ensureDir(targetDirectory);

    // Check if LSPServer needs to be extracted or updated
    const lspServerPath = path.join(targetDirectory, 'LSPServer');
    const serverZipFile = path.join(__dirname, assetsFolderName, 'LSPServer', 'LSPServer.zip');
    const versionMarkerFile = path.join(targetDirectory, '.lspserver-version');
    // Temporary method to determine whether to exract or update...add a more permanent method after
    const shouldExtract = await shouldExtractOrUpdate(serverZipFile, versionMarkerFile, lspServerPath);

    if (shouldExtract) {
      try {
        const zip = new AdmZip(serverZipFile);
        await zip.extractAllTo(targetDirectory, /* overwrite */ true, /* Permissions */ true);

        // Write version marker with zip file's modification time
        const zipStats = await fse.stat(serverZipFile);
        await fse.writeFile(versionMarkerFile, zipStats.mtime.toISOString());
      } catch (error) {
        throw new Error(`Error extracting LSP server: ${error}`);
      }
    }

    // Check if SDK needs to be copied or updated
    const lspDirectoryPath = path.join(targetDirectory, lspDirectory);
    const sdkNupkgFile = path.join(__dirname, assetsFolderName, 'LSPServer', 'Microsoft.Azure.Workflows.Sdk.1.0.0-preview.1.nupkg');
    const sdkVersionMarkerFile = path.join(targetDirectory, '.lspsdk-version');

    const shouldCopy = await shouldExtractOrUpdate(sdkNupkgFile, sdkVersionMarkerFile, lspDirectoryPath);

    if (shouldCopy) {
      try {
        await fse.ensureDir(lspDirectoryPath);

        const destinationFile = path.join(lspDirectoryPath, path.basename(sdkNupkgFile));
        await fse.copyFile(sdkNupkgFile, destinationFile);

        // Write version marker with SDK file's modification time
        const sdkStats = await fse.stat(sdkNupkgFile);
        await fse.writeFile(sdkVersionMarkerFile, sdkStats.mtime.toISOString());
      } catch (error) {
        throw new Error(`Error copying sdk: ${error}`);
      }
    }
  });
}

/**
 * Determines if a file should be extracted/copied by comparing modification times.
 * @param sourceFile - The source zip or file to check
 * @param versionMarkerFile - The version marker file that stores the last extraction time
 * @param targetPath - The target directory/file path
 * @returns true if extraction/copy is needed, false otherwise
 */
async function shouldExtractOrUpdate(sourceFile: string, versionMarkerFile: string, targetPath: string): Promise<boolean> {
  // If target doesn't exist, we need to extract
  if (!(await fse.pathExists(targetPath))) {
    return true;
  }

  // If version marker doesn't exist, we need to extract
  if (!(await fse.pathExists(versionMarkerFile))) {
    return true;
  }

  try {
    // Compare source file modification time with stored version
    const sourceStats = await fse.stat(sourceFile);
    const storedVersion = await fse.readFile(versionMarkerFile, 'utf-8');
    const storedTime = new Date(storedVersion.trim());

    // If source is newer than stored version, we need to extract
    return sourceStats.mtime > storedTime;
  } catch {
    // If there's any error reading versions, extract to be safe
    return true;
  }
}
