import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import {
  autoRuntimeDependenciesPathSettingKey,
  autoRuntimeDependenciesValidationAndInstallationSetting,
  connectionsFileName,
  languageServerDLLPathSettingKey,
  languageServerNupkgPathSettingKey,
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
import type { AzureConnectorDetails } from '@microsoft/vscode-extension-logic-apps';
import { getAzureConnectorDetailsForLocalProject } from '../utils/codeless/common';
import * as vscode from 'vscode';
import { filterCompletionResult } from './completionFilter';
import { getDotNetCommand } from '../utils/dotnet/dotnet';

export default class LogicAppsLanguageServer {
  protected lspServerPath: string | undefined;
  protected sdkNupkgPath: string | undefined;
  protected apiVersion = workflowAppApiVersion;
  private projectPath: string | undefined;
  protected readonly context: IActionContext;

  constructor(context: IActionContext) {
    this.context = context;
  }

  public async start(): Promise<void> {
    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
      return;
    }

    const workspaceFolder = await getWorkspaceFolderPath(this.context);
    this.projectPath = await tryGetLogicAppProjectRoot(this.context, workspaceFolder, true /* suppressPrompt */);

    if (!this.projectPath) {
      return;
    }

    const { lspServerPath, sdkNupkgPath } = await this.getSDKPaths();

    this.lspServerPath = lspServerPath;
    this.sdkNupkgPath = sdkNupkgPath;

    if (!this.lspServerPath) {
      window.showWarningMessage('Install or repair Logic Apps language server dependencies before starting C# workflow authoring.');
      return;
    }

    if (!this.sdkNupkgPath) {
      window.showWarningMessage('Install or repair Logic Apps language server SDK dependencies before starting C# workflow authoring.');
      return;
    }

    const metaData = await this.getMetadata();

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
      command: getDotNetCommand(),
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
        provideCompletionItem: async (document, position, context, token, next) => {
          const result = await next(document, position, context, token);
          return filterCompletionResult(result);
        },
        sendRequest: generalMiddleware.sendRequest,
        sendNotification: generalMiddleware.sendNotification,
      },
    };

    // Create the language client and start the client.
    ext.languageClient = new LanguageClient('logicAppsLanguageServer', 'Logic Apps language server', serverOptions, clientOptions);
    ext.context?.subscriptions.push(ext.languageClient);

    await ext.languageClient.start();
  }

  private async getSDKPaths() {
    const autoValidate = getGlobalSetting<boolean>(autoRuntimeDependenciesValidationAndInstallationSetting);

    if (!autoValidate) {
      // Manual mode: read explicit path settings
      const lspServerPath = getGlobalSetting<string>(languageServerDLLPathSettingKey) || undefined;
      const sdkNupkgPath = getGlobalSetting<string>(languageServerNupkgPathSettingKey) || undefined;

      if (lspServerPath && !(await fse.pathExists(lspServerPath))) {
        window.showWarningMessage(`Language server DLL not found at configured path: ${lspServerPath}`);
        return { lspServerPath: undefined, sdkNupkgPath };
      }

      if (sdkNupkgPath && !(await fse.pathExists(sdkNupkgPath))) {
        window.showWarningMessage(`Language server SDK nupkg not found at configured path: ${sdkNupkgPath}`);
        return { lspServerPath, sdkNupkgPath: undefined };
      }

      return { lspServerPath, sdkNupkgPath };
    }

    // Auto mode: construct paths from dependenciesPath
    const dependenciesPath = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
    if (!dependenciesPath) {
      return { lspServerPath: undefined, sdkNupkgPath: undefined };
    }

    // Support for development mode - override with environment variable
    const devLspServerPath = process.env.LSP_SERVER_DEV_PATH;
    let lspServerPath: string | undefined;

    if (devLspServerPath && (await fse.pathExists(devLspServerPath))) {
      lspServerPath = devLspServerPath;
      console.log(`[LSP] Using development server: ${lspServerPath}`);
    } else {
      lspServerPath = path.join(dependenciesPath, 'LSPServer', 'SdkLspServer.dll');
      if (!(await fse.pathExists(lspServerPath))) {
        lspServerPath = undefined;
      }
    }

    const sdkFolderPath = path.join(dependenciesPath, lspDirectory);
    if (!(await fse.pathExists(sdkFolderPath))) {
      return { lspServerPath, sdkNupkgPath: undefined };
    }

    const files = await fse.readdir(sdkFolderPath);
    const sdkNupkgFile = files.find((file) => {
      return file.startsWith('Microsoft.Azure.Workflows.Sdk.') && file.endsWith('.nupkg');
    });
    if (!sdkNupkgFile) {
      return { lspServerPath, sdkNupkgPath: undefined };
    }

    const sdkNupkgPath = path.join(sdkFolderPath, sdkNupkgFile);

    return { lspServerPath, sdkNupkgPath };
  }

  private async getMetadata() {
    if (!this.projectPath) {
      throw new Error('Logic Apps language server cannot start without a Logic App project path.');
    }

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
    const languageServer = new LogicAppsLanguageServer(context);
    await languageServer.start();
  });
};

/**
 * Gets workflow metadata from the LSP server including trigger names.
 * Uses a custom LSP request to query the workflow structure.
 * @param workflowFilePath - The absolute path to the codeful workflow .cs file
 * @returns Workflow metadata including workflow name and trigger name, or undefined if not available
 */
export async function getCodefulWorkflowMetadata(
  workflowFilePath: string
): Promise<{ workflowName: string; triggerName: string } | undefined> {
  if (!ext.languageClient) {
    console.warn('[LSP] Language client not initialized');
    return undefined;
  }

  try {
    // Use the custom LSP request to get workflow metadata
    const response = await ext.languageClient.sendRequest<{ workflowName: string; triggerName: string } | null>(
      'custom/getWorkflowMetadata',
      { uri: workflowFilePath }
    );

    if (!response) {
      console.warn('[LSP] No workflow metadata returned from server');
      return undefined;
    }

    return response;
  } catch (error) {
    console.error('[LSP] Failed to get workflow metadata:', error);
    return undefined;
  }
}
