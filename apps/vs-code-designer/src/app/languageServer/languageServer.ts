import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import {
  assetsFolderName,
  autoRuntimeDependenciesPathSettingKey,
  connectionsFileName,
  lspDirectory,
  onStartLanguageServerProtocol,
} from '../../constants';
import { workspace, window, MarkdownString } from 'vscode';
import type { Executable, ServerOptions, LanguageClientOptions, HoverMiddleware, Middleware } from 'vscode-languageclient/node';
import { LanguageClient } from 'vscode-languageclient/node';
import { ext } from '../../extensionVariables';
import { getWorkspaceFolderPath } from '../commands/workflows/switchDebugMode/switchDebugMode';
import { tryGetLogicAppProjectRoot } from '../utils/verifyIsProject';
import path from 'path';
import * as fse from 'fs-extra';
import { getGlobalSetting } from '../utils/vsCodeConfig/settings';
import AdmZip from 'adm-zip';

const getSDKPaths = async (context: IActionContext) => {
  const workspaceFolder = await getWorkspaceFolderPath(context);
  const dependenciesPath = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder, true /* suppressPrompt */);

  const sdkFolderPath = path.join(dependenciesPath, lspDirectory);
  const lspServerPath = path.join(dependenciesPath, 'LSPServer', 'SdkLspServer.dll');

  const files = await fse.readdir(sdkFolderPath);
  const sdkNupkgFile = files.find((file) => {
    return file.startsWith('Microsoft.Azure.Workflows.Agents.Sdk.') && file.endsWith('.nupkg');
  });

  const sdkNupkgPath = path.join(sdkFolderPath, sdkNupkgFile);

  const connectionFilePath: string = path.join(projectPath, connectionsFileName);
  return { lspServerPath, sdkNupkgPath, connectionFilePath };
};

const initializeServerLanguageClient = async (context: IActionContext) => {
  const { lspServerPath, sdkNupkgPath, connectionFilePath } = await getSDKPaths(context);

  if (!lspServerPath) {
    window.showWarningMessage('Set "azureLogicAppsStandard.languageServerDLLPath" to your C# server DLL.');
    return;
  }

  if (!sdkNupkgPath) {
    window.showWarningMessage('Set "azureLogicAppsStandard.languageServerNupkgPath" to your SDK NuGet package.');
    return;
  }

  const run: Executable = {
    command: 'dotnet',
    args: [lspServerPath, '--sdk', sdkNupkgPath, '--connections', connectionFilePath],
  };

  const serverOptions: ServerOptions = { run, debug: run };
  const fileSystemWatcher = workspace.createFileSystemWatcher('**/*.cs');

  const hoverMiddleware: HoverMiddleware = {
    provideHover: async (document, position, token, next) => {
      const response = await next(document, position, token);
      if (!response) {
        return;
      }

      response.contents = response.contents.map((content) => {
        if (content instanceof MarkdownString) {
          return content;
        }
        const alteredContent = new MarkdownString(typeof content === 'string' ? content : content.value);

        alteredContent.isTrusted = true;
        return alteredContent;
      });

      return response;
    },
  };

  const generalMiddleware: Middleware = {
    sendRequest: (type, param, token, next) => {
      return next(type, param, token);
    },
    sendNotification: (type, next, params) => {
      return next(type, params);
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'csharp' }],
    synchronize: {
      fileEvents: fileSystemWatcher,
    },
    middleware: { ...hoverMiddleware, ...generalMiddleware },
  };

  // Create the language client and start the client.
  ext.client = new LanguageClient('logicAppsLanguageServer', 'Logic Apps language server', serverOptions, clientOptions);

  ext.client.start().catch((err) => {
    console.error('Failed to start language client', err);
  });
};

export const startLanguageServerProtocol = async () => {
  await callWithTelemetryAndErrorHandling(onStartLanguageServerProtocol, async (context: IActionContext) => {
    initializeServerLanguageClient(context);
  });
};

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
      const sdkNupkgFile = path.join(__dirname, assetsFolderName, 'LSPServer', 'Microsoft.Azure.Workflows.Agents.Sdk.1.141.0.7.nupkg');
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
