import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import {
  assetsFolderName,
  autoRuntimeDependenciesPathSettingKey,
  connectionsFileName,
  lspDirectory,
  onStartLanguageServerProtocol,
  workflowAppApiVersion,
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
import type { AzureConnectorDetails } from '@microsoft/vscode-extension-logic-apps';
import { getAzureConnectorDetailsForLocalProject } from '../utils/codeless/common';

export default class LogicAppsSeverLanguage {
  protected lspServerPath: string;
  protected sdkNupkgPath: string;
  protected apiVersion = workflowAppApiVersion;
  private projectPath: string;
  protected readonly context: IActionContext;

  constructor(context: IActionContext) {
    this.context = context;
  }

  public async start(): Promise<void> {
    const workspaceFolder = await getWorkspaceFolderPath(this.context);
    this.projectPath = await tryGetLogicAppProjectRoot(this.context, workspaceFolder, true /* suppressPrompt */);
    const { lspServerPath, sdkNupkgPath } = await this.getSDKPaths();

    this.lspServerPath = lspServerPath;
    this.sdkNupkgPath = sdkNupkgPath;
    const metaData = await this.getMetadata();

    if (!this.lspServerPath) {
      window.showWarningMessage('Set "azureLogicAppsStandard.languageServerDLLPath" to your C# server DLL.');
      return;
    }

    if (!this.sdkNupkgPath) {
      window.showWarningMessage('Set "azureLogicAppsStandard.languageServerNupkgPath" to your SDK NuGet package.');
      return;
    }

    // Build server arguments
    const serverArgs = [this.lspServerPath, '--sdk', this.sdkNupkgPath, '--connections', metaData.connectionFilePath];

    // Get initial API config from settings or defaults
    const apiConfig = {
      baseUrl: 'https://management.azure.com',
      subscription: metaData.azureDetails.subscriptionId,
      resourceGroup: metaData.azureDetails.resourceGroupName,
    };

    // Support for debugger wait mode in development
    if (process.env.LSP_WAIT_FOR_DEBUGGER === 'true') {
      serverArgs.push('--wait-for-debugger');
      window.showInformationMessage('LSP Server starting in debug mode - attach debugger and press any key in the server console');
    }

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

    const run: Executable = {
      command: 'dotnet',
      args: serverArgs,
    };

    const serverOptions: ServerOptions = { run, debug: run };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ scheme: 'file', language: 'csharp' }],
      synchronize: {
        fileEvents: fileSystemWatcher,
      },
      initializationOptions: {
        apiConfig: apiConfig,
      },
      middleware: { ...hoverMiddleware, ...generalMiddleware },
    };

    // Create the language client and start the client.
    ext.languageClient = new LanguageClient('logicAppsLanguageServer', 'Logic Apps language server', serverOptions, clientOptions);

    ext.languageClient.start().catch((err) => {
      console.error('Failed to start language client', err);
      throw err;
    });
  }

  private async getSDKPaths() {
    const dependenciesPath = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);

    // Support for development mode - override with environment variable
    const devLspServerPath = process.env.LSP_SERVER_DEV_PATH;
    let lspServerPath: string;

    if (devLspServerPath && (await fse.pathExists(devLspServerPath))) {
      lspServerPath = devLspServerPath;
      console.log(`[LSP] Using development server: ${lspServerPath}`);
    } else {
      lspServerPath = path.join(dependenciesPath, 'LSPServer', 'SdkLspServer.dll');
    }

    const sdkFolderPath = path.join(dependenciesPath, lspDirectory);
    const files = await fse.readdir(sdkFolderPath);
    const sdkNupkgFile = files.find((file) => {
      return file.startsWith('Microsoft.Azure.Workflows.Agents.Sdk.') && file.endsWith('.nupkg');
    });

    const sdkNupkgPath = path.join(sdkFolderPath, sdkNupkgFile);

    return { lspServerPath, sdkNupkgPath };
  }

  private async getMetadata() {
    const azureDetails: AzureConnectorDetails = await getAzureConnectorDetailsForLocalProject(this.context, this.projectPath);
    const connectionFilePath: string = path.join(this.projectPath, connectionsFileName);

    return {
      connectionFilePath,
      azureDetails,
      accessToken: azureDetails.accessToken,
    };
  }
}

export const startLanguageServerProtocol = async () => {
  await callWithTelemetryAndErrorHandling(onStartLanguageServerProtocol, async (context: IActionContext) => {
    const languageServer = new LogicAppsSeverLanguage(context);
    languageServer.start();
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
