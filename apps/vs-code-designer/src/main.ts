import { LogicAppResolver } from './LogicAppResolver';
import { runPostWorkflowCreateStepsFromCache } from './app/commands/createCodeless/createCodelessSteps/WorkflowCreateStepBase';
import { runPostExtractStepsFromCache } from './app/commands/createNewCodeProject/CodeProjectBase/ProcessPackageStep';
import {
  supportedDataMapDefinitionFileExts,
  supportedDataMapperFolders,
  supportedSchemaFileExts,
} from './app/commands/dataMapper/extensionConfig';
import { promptParameterizeConnections } from './app/commands/parameterizeConnections';
import { registerCommands } from './app/commands/registerCommands';
import { getResourceGroupsApi } from './app/resourcesExtension/getExtensionApi';
import type { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { downloadExtensionBundle } from './app/utils/bundleFeed';
import { stopDesignTimeApi } from './app/utils/codeless/startDesignTimeApi';
import { UriHandler } from './app/utils/codeless/urihandler';
import { getExtensionVersion } from './app/utils/extension';
import { registerFuncHostTaskEvents } from './app/utils/funcCoreTools/funcHostTask';
import { verifyVSCodeConfigOnActivate } from './app/utils/vsCodeConfig/verifyVSCodeConfigOnActivate';
import { extensionCommand, logicAppFilter } from './constants';
import { ext } from './extensionVariables';
import { startOnboarding } from './onboarding';
import { registerAppServiceExtensionVariables } from '@microsoft/vscode-azext-azureappservice';
import { verifyLocalConnectionKeys } from './app/utils/appSettings/connectionKeys';
import {
  callWithTelemetryAndErrorHandling,
  createAzExtOutputChannel,
  registerEvent,
  registerReportIssueCommand,
  registerUIExtensionVariables,
  getAzExtResourceType,
} from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ConvertToWorkspace } from './app/commands/createNewCodeProject/CodeProjectBase/ConvertToWorkspace';
import TelemetryReporter from '@vscode/extension-telemetry';
import { createVSCodeAzureSubscriptionProvider } from './app/utils/services/VSCodeAzureSubscriptionProvider';
import { logSubscriptions } from './app/utils/telemetry';
import type { Executable, ServerOptions, LanguageClientOptions, HoverMiddleware, Middleware } from 'vscode-languageclient/node';
import { LanguageClient } from 'vscode-languageclient/node';

const perfStats = {
  loadStartTime: Date.now(),
  loadEndTime: undefined,
};

const telemetryString = 'setInGitHubBuild';

let client: LanguageClient;

export async function activate(context: vscode.ExtensionContext) {
  const exe: Executable = {
    command: 'dotnet',
    args: ['C:\\Users\\dacogbur\\source\\repos\\ConsoleApp1\\ConsoleApp1\\bin\\Release\\net9.0\\publish\\ConsoleApp1.dll'],
  };

  const serverOptions: ServerOptions = {
    debug: exe,
    run: exe,
  };

  const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.cs');

  fileSystemWatcher.onDidChange((uri) => {
    console.log(`File changed: ${uri.fsPath}`);
  });

  const hoverMiddleware: HoverMiddleware = {
    provideHover: async (document, position, token, next) => {
      console.log(`Hover requested at ${position.line}:${position.character}`);

      const response = await next(document, position, token);
      if (response) {
        console.log(`Hover response: ${JSON.stringify(response)}`);
      } else {
        // log error
      }

      response.contents = response.contents.map((content) => {
        if (content instanceof vscode.MarkdownString) {
          const args = [{ connectorId: 'eventhub' }];
          const stageCommandUri = vscode.Uri.parse(
            `command:azureLogicAppsStandard.openConnectionView?${encodeURIComponent(JSON.stringify(args))}`
          );
          const contentsAdded = new vscode.MarkdownString(`[Stage file](${stageCommandUri})`);
          contentsAdded.isTrusted = true;

          return contentsAdded;
        }
        const alteredContent = new vscode.MarkdownString(typeof content === 'string' ? content : content.value);

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
  client = new LanguageClient('languageServerExample', 'Language Server Example', serverOptions, clientOptions);

  client.onDidChangeState((e) => {
    console.log(`Client state changed: ${e.newState}`);
  });

  client.start();

  // Data Mapper context
  vscode.commands.executeCommand(
    'setContext',
    extensionCommand.dataMapSetSupportedDataMapDefinitionFileExts,
    supportedDataMapDefinitionFileExts
  );
  vscode.commands.executeCommand('setContext', extensionCommand.dataMapSetSupportedSchemaFileExts, supportedSchemaFileExts);
  vscode.commands.executeCommand('setContext', extensionCommand.dataMapSetSupportedFileExts, [
    ...supportedDataMapDefinitionFileExts,
    ...supportedSchemaFileExts,
  ]);
  vscode.commands.executeCommand('setContext', extensionCommand.dataMapSetDmFolders, supportedDataMapperFolders);

  ext.context = context;
  ext.telemetryReporter = new TelemetryReporter(telemetryString);
  ext.subscriptionProvider = createVSCodeAzureSubscriptionProvider();
  context.subscriptions.push(ext.telemetryReporter);

  ext.outputChannel = createAzExtOutputChannel('Azure Logic Apps (Standard)', ext.prefix);
  registerUIExtensionVariables(ext);
  registerAppServiceExtensionVariables(ext);

  await callWithTelemetryAndErrorHandling(extensionCommand.activate, async (activateContext: IActionContext) => {
    activateContext.telemetry.properties.isActivationEvent = 'true';
    activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

    runPostWorkflowCreateStepsFromCache();
    runPostExtractStepsFromCache();
    await logSubscriptions(activateContext);

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      await ConvertToWorkspace(activateContext);
    }

    try {
      await downloadExtensionBundle(activateContext);
    } catch (error) {
      // log the error message to telemetry.
      const errorMessage = `Error downloading and extracting the Logic Apps Standard extension bundle: ${error.message}`;
      activateContext.telemetry.properties.errorMessage = errorMessage;
    }
    promptParameterizeConnections(activateContext, true);
    verifyLocalConnectionKeys(activateContext, true);
    await startOnboarding(activateContext);
    //await prepareTestExplorer(context, activateContext);

    ext.extensionVersion = getExtensionVersion();
    ext.currentBundleVersion = activateContext.telemetry.properties.latestBundleVersion;
    ext.latestBundleVersion = activateContext.telemetry.properties.latestBundleVersion;

    ext.rgApi = await getResourceGroupsApi();
    // @ts-ignore
    ext.azureAccountTreeItem = ext.rgApi.appResourceTree._rootTreeItem as AzureAccountTreeItemWithProjects;

    activateContext.telemetry.properties.lastStep = 'verifyVSCodeConfigOnActivate';
    callWithTelemetryAndErrorHandling(extensionCommand.validateLogicAppProjects, async (actionContext: IActionContext) => {
      await verifyVSCodeConfigOnActivate(actionContext, vscode.workspace.workspaceFolders);
    });

    activateContext.telemetry.properties.lastStep = 'registerEvent';
    registerEvent(
      extensionCommand.validateLogicAppProjects,
      vscode.workspace.onDidChangeWorkspaceFolders,
      async (actionContext: IActionContext, event: vscode.WorkspaceFoldersChangeEvent) => {
        await verifyVSCodeConfigOnActivate(actionContext, event.added);
      }
    );

    context.subscriptions.push(ext.outputChannel);
    context.subscriptions.push(ext.azureAccountTreeItem);

    activateContext.telemetry.properties.lastStep = 'registerReportIssueCommand';
    registerReportIssueCommand(extensionCommand.reportIssue);
    activateContext.telemetry.properties.lastStep = 'registerCommands';
    registerCommands();
    activateContext.telemetry.properties.lastStep = 'registerFuncHostTaskEvents';
    registerFuncHostTaskEvents();

    ext.rgApi.registerApplicationResourceResolver(getAzExtResourceType(logicAppFilter), new LogicAppResolver());

    vscode.window.registerUriHandler(new UriHandler());
  });
}

export function deactivate(): Promise<any> {
  stopDesignTimeApi();
  ext.unitTestController?.dispose();
  ext.telemetryReporter.dispose();
  return undefined;
}

perfStats.loadEndTime = Date.now();
