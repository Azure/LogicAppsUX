import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import path from 'path';
import * as fse from 'fs-extra';
import { assetsFolderName, lspDirectory } from '../../constants';
import { ext } from '../../extensionVariables';
import { ensureRuntimeDependenciesPath } from './runtimeDependenciesPath';
import AdmZip from 'adm-zip';
import { createHash } from 'crypto';

const lspServerDirectoryName = 'LSPServer';
const lspServerHashMarkerName = '.lspserver-hash';
const lspSdkHashMarkerName = '.lspsdk-hash';

export async function installLSPSDK(): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.installLSPSDK', async () => {
    const targetDirectory = await ensureRuntimeDependenciesPath();

    // Check if LSPServer needs to be extracted or updated
    const serverZipFile = path.join(__dirname, assetsFolderName, 'LSPServer', 'LSPServer.zip');
    const serverHashMarkerFile = path.join(targetDirectory, lspServerHashMarkerName);
    const lspServerPath = path.join(targetDirectory, lspServerDirectoryName);
    const lspServerDllPath = path.join(lspServerPath, 'SdkLspServer.dll');
    const serverZipHash = await getFileHash(serverZipFile);
    const shouldExtract = await shouldUpdateFromHash(serverZipHash, serverHashMarkerFile, lspServerDllPath);

    // Check if SDK needs to be copied or updated
    const lspDirectoryPath = path.join(targetDirectory, lspDirectory);
    const sdkNupkgFile = path.join(__dirname, assetsFolderName, 'LSPServer', 'Microsoft.Azure.Workflows.Sdk.1.0.0-preview.1.nupkg');
    const sdkHashMarkerFile = path.join(targetDirectory, lspSdkHashMarkerName);
    const destinationFile = path.join(lspDirectoryPath, path.basename(sdkNupkgFile));
    const sdkHash = await getFileHash(sdkNupkgFile);

    const shouldCopy = await shouldCopySdkFromHash(sdkHash, sdkHashMarkerFile, destinationFile);

    if (shouldExtract || shouldCopy) {
      await stopLanguageClientForUpdate();
    }

    if (shouldExtract) {
      try {
        if (await fse.pathExists(lspServerPath)) {
          await fse.remove(lspServerPath);
        }

        const zip = new AdmZip(serverZipFile);
        await zip.extractAllTo(targetDirectory, /* overwrite */ true, /* Permissions */ true);

        if (!(await fse.pathExists(lspServerDllPath))) {
          throw new Error(`Extracted LSP server is missing ${lspServerDllPath}`);
        }

        await fse.writeFile(serverHashMarkerFile, serverZipHash);
        await removeLegacyLspMarkers(targetDirectory);
        await cleanupStaleLspServerFolders(targetDirectory);
      } catch (error) {
        throw new Error(`Error extracting LSP server: ${formatLockedFileError(error)}`);
      }
    }

    if (shouldCopy) {
      try {
        await fse.ensureDir(lspDirectoryPath);

        await fse.copyFile(sdkNupkgFile, destinationFile);

        await fse.writeFile(sdkHashMarkerFile, sdkHash);
        await fse.remove(path.join(targetDirectory, '.lspsdk-version'));
      } catch (error) {
        throw new Error(`Error copying sdk: ${formatLockedFileError(error)}`);
      }
    }
  });
}

/**
 * Determines if an asset should be installed by comparing content hashes.
 * @param sourceHash - The source file hash to compare
 * @param hashMarkerFile - The hash marker file that stores the last installed source hash
 * @param targetPath - The required installed target path
 * @returns true if installation is needed, false otherwise
 */
async function shouldUpdateFromHash(sourceHash: string, hashMarkerFile: string, targetPath: string): Promise<boolean> {
  if (!(await fse.pathExists(targetPath))) {
    return true;
  }

  if (!(await fse.pathExists(hashMarkerFile))) {
    return true;
  }

  try {
    const storedHash = (await fse.readFile(hashMarkerFile, 'utf-8')).trim();
    return storedHash !== sourceHash;
  } catch {
    return true;
  }
}

async function shouldCopySdkFromHash(sourceHash: string, hashMarkerFile: string, destinationFile: string): Promise<boolean> {
  if (await shouldUpdateFromHash(sourceHash, hashMarkerFile, destinationFile)) {
    return true;
  }

  try {
    return (await getFileHash(destinationFile)) !== sourceHash;
  } catch {
    return true;
  }
}

async function getFileHash(filePath: string): Promise<string> {
  const fileContent = await fse.readFile(filePath);
  return createHash('sha256').update(fileContent.toString('latin1'), 'latin1').digest('hex');
}

async function removeLegacyLspMarkers(targetDirectory: string): Promise<void> {
  await fse.remove(path.join(targetDirectory, '.lspserver-version'));
  await fse.remove(path.join(targetDirectory, '.lspserver-path'));
}

async function cleanupStaleLspServerFolders(targetDirectory: string): Promise<void> {
  try {
    const entries = await fse.readdir(targetDirectory);
    await Promise.all(
      entries
        .filter((entry) => entry.startsWith(`${lspServerDirectoryName}-`))
        .map((entry) => fse.remove(path.join(targetDirectory, entry)))
    );
  } catch (error) {
    ext.outputChannel?.appendLog(`Unable to clean stale LSP server folders: ${error}`);
  }
}

async function stopLanguageClientForUpdate(): Promise<void> {
  const languageClient = ext.languageClient;
  if (!languageClient) {
    return;
  }

  try {
    await languageClient.stop();
    if (ext.languageClient === languageClient) {
      ext.languageClient = undefined;
    }
  } catch (error) {
    throw new Error(`Error stopping LSP server before update: ${error}`);
  }
}

function formatLockedFileError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof Error && 'code' in error ? String(error.code) : '';
  const isLockedFileError =
    code === 'EBUSY' || message.includes('EBUSY') || message.includes('resource busy') || message.includes('locked');

  if (!isLockedFileError) {
    return String(error);
  }

  return `${String(error)}. The Logic Apps language server appears to still be using files in the dependency folder. Close or reload VS Code, stop the dotnet process running SdkLspServer.dll, and retry dependency installation.`;
}
