import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { connectionsFileName, onStartLanguageServerProtocol } from '../../constants';
import { workspace, window, MarkdownString } from 'vscode';
import type { Executable, ServerOptions, LanguageClientOptions, HoverMiddleware, Middleware } from 'vscode-languageclient/node';
import { LanguageClient } from 'vscode-languageclient/node';
import { ext } from '../../extensionVariables';
import { getWorkspaceFolderPath } from '../commands/workflows/switchDebugMode/switchDebugMode';
import { tryGetLogicAppProjectRoot } from '../utils/verifyIsProject';
import path from 'path';

const initializeServerLanguageClient = async (context: IActionContext) => {
  const configuration = workspace.getConfiguration();
  const serverDllPath = configuration.get<string>('azureLogicAppsStandard.languageServerDLLPath') || '';
  const sdkNupkg = configuration.get<string>('azureLogicAppsStandard.languageServerNupkgPath') || '';
  const workspaceFolder = await getWorkspaceFolderPath(context);
  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder, true /* suppressPrompt */);
  const connectionFilePath: string = path.join(projectPath, connectionsFileName);

  if (!serverDllPath) {
    window.showWarningMessage('Set "azureLogicAppsStandard.languageServerDLLPath" to your C# server DLL.');
    return;
  }

  if (!sdkNupkg) {
    window.showWarningMessage('Set "azureLogicAppsStandard.languageServerNupkgPath" to your SDK NuGet package.');
    return;
  }

  const run: Executable = {
    command: 'dotnet',
    args: [serverDllPath, '--sdk', sdkNupkg, '--connections', connectionFilePath],
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
