import path from 'path';
import * as fse from 'fs-extra';
import { assetsFolderName } from '../../constants';
import { ext } from '../../extensionVariables';
import { lspServerAssetRevision, lspServerDirectoryName, lspServerRevisionMarkerName } from './languageServerProtocolConstants';
import AdmZip from 'adm-zip';
import { ensureRuntimeDependenciesDir } from './binaries';

export { lspServerAssetRevision, lspServerDirectoryName, lspServerRevisionMarkerName };
const lockedFileErrorCodes = new Set(['EBUSY', 'EPERM']);
const lockedFileRetryDelayMs = 2000;
const lockedFileRetryAttempts = 3;

export async function installLSPServer(): Promise<void> {
  const targetDirectory = await ensureRuntimeDependenciesDir();

  // Check if LSPServer needs to be extracted or updated
  const serverZipFile = path.join(__dirname, assetsFolderName, 'LSPServer', 'LSPServer.zip');
  const serverRevisionMarkerFile = path.join(targetDirectory, lspServerRevisionMarkerName);
  const lspServerPath = path.join(targetDirectory, lspServerDirectoryName);
  const lspServerDllPath = path.join(lspServerPath, 'SdkLspServer.dll');
  const shouldExtract = await shouldUpdateFromRevision(lspServerAssetRevision, serverRevisionMarkerFile, lspServerDllPath);

  if (shouldExtract) {
    await stopLanguageClientForUpdate();
  }

  if (shouldExtract) {
    try {
      if (await fse.pathExists(lspServerPath)) {
        await removeWithRetry(lspServerPath);
      }

      const zip = new AdmZip(serverZipFile);
      await runWithLockedFileRetry(() => zip.extractAllTo(targetDirectory, /* overwrite */ true, /* Permissions */ true));

      if (!(await fse.pathExists(lspServerDllPath))) {
        throw new Error(`Extracted LSP server is missing ${lspServerDllPath}`);
      }

      await fse.writeFile(serverRevisionMarkerFile, lspServerAssetRevision);
      await removeLegacyLspMarkers(targetDirectory);
      await cleanupStaleLspServerFolders(targetDirectory);
    } catch (error) {
      throw new Error(`Error extracting LSP server: ${formatLockedFileError(error)}`);
    }
  }
}

/**
 * Determines if an asset should be installed by comparing publisher-controlled revisions.
 * @param sourceRevision - The revision of the packaged asset
 * @param revisionMarkerFile - The marker file that stores the installed revision
 * @param targetPath - The required installed target path
 * @returns true if installation is needed, false otherwise
 */
async function shouldUpdateFromRevision(sourceRevision: string, revisionMarkerFile: string, targetPath: string): Promise<boolean> {
  if (!(await fse.pathExists(targetPath))) {
    return true;
  }

  if (!(await fse.pathExists(revisionMarkerFile))) {
    return true;
  }

  try {
    const installedRevision = (await fse.readFile(revisionMarkerFile, 'utf-8')).trim();
    return installedRevision !== sourceRevision;
  } catch {
    return true;
  }
}

async function removeLegacyLspMarkers(targetDirectory: string): Promise<void> {
  await fse.remove(path.join(targetDirectory, '.lspserver-version'));
  await fse.remove(path.join(targetDirectory, '.lspserver-path'));
  await fse.remove(path.join(targetDirectory, '.lspserver-hash'));
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

async function removeWithRetry(targetPath: string): Promise<void> {
  await runWithLockedFileRetry(() => fse.remove(targetPath));
}

async function runWithLockedFileRetry(operation: () => Promise<void> | void): Promise<void> {
  for (let attempt = 1; attempt <= lockedFileRetryAttempts; attempt++) {
    try {
      await operation();
      return;
    } catch (error) {
      if (!isLockedFileError(error) || attempt === lockedFileRetryAttempts) {
        throw error;
      }

      await sleep(lockedFileRetryDelayMs);
    }
  }
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isLockedFileError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof Error && 'code' in error ? String(error.code) : '';

  return (
    lockedFileErrorCodes.has(code) ||
    message.includes('EBUSY') ||
    message.includes('EPERM') ||
    message.includes('resource busy') ||
    message.includes('locked')
  );
}

export function formatLockedFileError(error: unknown): string {
  const lockedFileError = isLockedFileError(error);

  if (!lockedFileError) {
    return String(error);
  }

  return `${String(error)}. The Logic Apps language server appears to still be using files in the dependency folder. Close or reload VS Code, stop the dotnet process running SdkLspServer.dll, and retry dependency installation.`;
}
