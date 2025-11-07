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

    // Check if LSPServer folder already exists
    const lspServerPath = path.join(targetDirectory, 'LSPServer');
    const shouldExtract = !(await fse.pathExists(lspServerPath));

    if (shouldExtract) {
      const serverZipFile = path.join(__dirname, assetsFolderName, 'LSPServer', 'LSPServer.zip');
      try {
        const zip = new AdmZip(serverZipFile);
        await zip.extractAllTo(targetDirectory, /* overwrite */ true, /* Permissions */ true);
      } catch (error) {
        throw new Error(`Error extracting worker isolated: ${error}`);
      }
    }

    // Check if LanguageServerLogicApps folder already exists
    const lspDirectoryPath = path.join(targetDirectory, lspDirectory);
    const shouldCopy = !(await fse.pathExists(lspDirectoryPath));

    if (shouldCopy) {
      const sdkNupkgFile = path.join(__dirname, assetsFolderName, 'LSPServer', 'Microsoft.Azure.Workflows.Sdk.Agents.1.141.0.10.nupkg');
      try {
        await fse.ensureDir(lspDirectoryPath);

        const destinationFile = path.join(lspDirectoryPath, path.basename(sdkNupkgFile));
        await fse.copyFile(sdkNupkgFile, destinationFile);
      } catch (error) {
        throw new Error(`Error copying sdk: ${error}`);
      }
    }
  });
}
