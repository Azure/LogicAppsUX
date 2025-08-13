import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { onStartLanguageServerProtocol } from '../../constants';
import { workspace, window, MarkdownString } from 'vscode';
import type { Executable, ServerOptions, LanguageClientOptions, HoverMiddleware, Middleware } from 'vscode-languageclient/node';
import { LanguageClient } from 'vscode-languageclient/node';
import { ext } from '../../extensionVariables';

const initializeServerLanguageClient = () => {
  const configuration = workspace.getConfiguration();
  const serverDllPath = configuration.get<string>('sdkLsp.serverDllPath') || '';
  const sdkNupkg = configuration.get<string>('sdkLsp.sdkNupkg') || '';

  if (!serverDllPath) {
    window.showWarningMessage('Set "sdkLsp.serverDllPath" to your C# server DLL.');
    return;
  }

  if (!sdkNupkg) {
    window.showWarningMessage('Set "sdkLsp.sdkNupkg" to your SDK NuGet package.');
    return;
  }

  const run: Executable = {
    command: 'dotnet',
    args: [serverDllPath, '--sdk', sdkNupkg],
  };

  const serverOptions: ServerOptions = { run, debug: run };
  const fileSystemWatcher = workspace.createFileSystemWatcher('**/*.cs');

  const hoverMiddleware: HoverMiddleware = {
    provideHover: async (document, position, token, next) => {
      const response = await next(document, position, token);
      if (!response) {
        return;
      }
      console.log(`Hover response: ${JSON.stringify(response)}`);

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
      console.log(`Request sent: ${type}`);
      return next(type, param, token);
    },
    sendNotification: (type, next, params) => {
      console.log(`Notification sent: ${type}`);
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
  await callWithTelemetryAndErrorHandling(onStartLanguageServerProtocol, async () => {
    initializeServerLanguageClient();
  });
};
