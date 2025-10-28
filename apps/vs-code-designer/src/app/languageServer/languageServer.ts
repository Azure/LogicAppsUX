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
import * as vscode from 'vscode';

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

    // Build server arguments (removed --connections)
    const serverArgs = [this.lspServerPath, '--sdk', this.sdkNupkgPath];

    // Load connections from file
    const connections = await this.loadConnectionsFromFile(metaData.connectionFilePath);

    // Get initial API config from settings or defaults
    const apiConfig = {
      baseUrl: 'https://management.azure.com',
      subscriptionId: metaData.azureDetails.subscriptionId,
      resourceGroup: metaData.azureDetails.resourceGroupName,
      bearerToken: metaData.accessToken,
    };

    // Support for debugger wait mode in development
    if (process.env.LSP_WAIT_FOR_DEBUGGER === 'true') {
      serverArgs.push('--wait-for-debugger');
      window.showInformationMessage('LSP Server starting in debug mode - attach debugger and press any key in the server console');
    }

    const fileSystemWatcher = workspace.createFileSystemWatcher('**/*.cs');

    // Watch connections.json for changes
    const connectionsWatcher = workspace.createFileSystemWatcher(metaData.connectionFilePath);
    connectionsWatcher.onDidChange(async () => {
      const updatedConnections = await this.loadConnectionsFromFile(metaData.connectionFilePath);
      if (ext.languageClient && updatedConnections) {
        try {
          await ext.languageClient.sendNotification('custom/updateConnections', updatedConnections);
        } catch (error) {
          console.error('[LSP] Failed to send connections update:', error);
        }
      }
    });

    const hoverMiddleware: HoverMiddleware = {
      provideHover: async (document, position, token, next) => {
        const response = await next(document, position, token);
        if (!response) {
          return;
        }

        response.contents = response.contents.map((content) => {
          if (content instanceof MarkdownString) {
            content.supportHtml = true;
            content.isTrusted = true;
            content.supportThemeIcons = true;
            return content;
          }
          const alteredContent = new MarkdownString(typeof content === 'string' ? content : content.value, true);

          alteredContent.supportHtml = true;
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
        connections: connections,
        telemetry: {
          connectionString: this.getTelemetryConnectionString(),
          enabled: this.getTelemetryConnectionString() ? true : false,
          samplingRate: 100,
          sessionId: vscode.env.sessionId,
        },
      },
      middleware: {
        provideHover: hoverMiddleware.provideHover,
        sendRequest: generalMiddleware.sendRequest,
        sendNotification: generalMiddleware.sendNotification,
      },
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
      return file.startsWith('Microsoft.Azure.Workflows.Sdk.Agents.') && file.endsWith('.nupkg');
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

  /**
   * Loads connections from a JSON file.
   * Returns the parsed connections object or null if the file doesn't exist or can't be parsed.
   */
  private async loadConnectionsFromFile(filePath: string): Promise<any | null> {
    try {
      if (!(await fse.pathExists(filePath))) {
        return null;
      }

      const fileContent = await fse.readFile(filePath, 'utf-8');
      const connections = JSON.parse(fileContent);
      return connections;
    } catch (error) {
      window.showErrorMessage(`Failed to load connections.json: ${error.message}`);
      return null;
    }
  }

  /**
   * Gets the Application Insights connection string for telemetry.
   * Priority: DEBUGTELEMETRY env variable > ext.telemetryString
   */
  private getTelemetryConnectionString(): string | undefined {
    // Check if DEBUGTELEMETRY is set (for local debugging)
    const debugTelemetry = process?.env?.DEBUGTELEMETRY;
    if (debugTelemetry === 'v') {
      console.log('[LSP] Debug telemetry mode enabled - telemetry will be logged locally');
      return 'debug'; // Special value to indicate debug mode
    }

    // Use production telemetry string from extension variables
    if (ext.telemetryString && ext.telemetryString !== 'setInGitHubBuild') {
      console.log('[LSP] Using production telemetry connection string');
      return ext.telemetryString;
    }

    console.log('[LSP] No telemetry connection string configured');
    return undefined;
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
      const sdkNupkgFile = path.join(__dirname, assetsFolderName, 'LSPServer', 'Microsoft.Azure.Workflows.Sdk.Agents.1.141.0.9.nupkg');
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
