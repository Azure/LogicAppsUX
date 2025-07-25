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
import { stopAllDesignTimeApis } from './app/utils/codeless/startDesignTimeApi';
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
import { convertToWorkspace } from './app/commands/createNewCodeProject/CodeProjectBase/ConvertToWorkspace';
import TelemetryReporter from '@vscode/extension-telemetry';
import { getAllCustomCodeFunctionsProjects } from './app/utils/customCodeUtils';
import { createVSCodeAzureSubscriptionProvider } from './app/utils/services/VSCodeAzureSubscriptionProvider';
import { logSubscriptions } from './app/utils/telemetry';
import { registerAzureUtilsExtensionVariables } from '@microsoft/vscode-azext-azureutils';

const perfStats = {
  loadStartTime: Date.now(),
  loadEndTime: undefined,
};

const telemetryString = 'setInGitHubBuild';

export async function activate(context: vscode.ExtensionContext) {
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

  vscode.debug.registerDebugConfigurationProvider('logicapp', {
    resolveDebugConfiguration: async (folder, debugConfig) => {
      if (!debugConfig.funcRuntime) {
        debugConfig.funcRuntime = 'coreclr';
      }
      const maxRetries = 3;
      const delayMs = 5000;
      for (let i = 0; i < maxRetries; i++) {
        try {
          await vscode.commands.executeCommand(extensionCommand.debugLogicApp, debugConfig, folder);
          break;
        } catch (error) {
          if (i === maxRetries - 1) {
            throw error;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return undefined;
    },
  });

  ext.context = context;
  ext.telemetryReporter = new TelemetryReporter(telemetryString);
  ext.subscriptionProvider = createVSCodeAzureSubscriptionProvider();
  context.subscriptions.push(ext.telemetryReporter);

  ext.outputChannel = createAzExtOutputChannel('Azure Logic Apps (Standard)', ext.prefix);
  registerUIExtensionVariables(ext);
  registerAzureUtilsExtensionVariables(ext);
  registerAppServiceExtensionVariables(ext);

  await callWithTelemetryAndErrorHandling(extensionCommand.activate, async (activateContext: IActionContext) => {
    vscode.commands.executeCommand(
      'setContext',
      extensionCommand.customCodeSetFunctionsFolders,
      await getAllCustomCodeFunctionsProjects(activateContext)
    );

    activateContext.telemetry.properties.isActivationEvent = 'true';

    runPostWorkflowCreateStepsFromCache();
    runPostExtractStepsFromCache();
    logSubscriptions(activateContext);

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      await convertToWorkspace(activateContext);
    }

    try {
      downloadExtensionBundle(activateContext);
    } catch (error) {
      // log the error message to telemetry.
      const errorMessage = `Error downloading and extracting the Logic Apps Standard extension bundle: ${error.message}`;
      activateContext.telemetry.properties.errorMessage = errorMessage;
    }

    promptParameterizeConnections(activateContext, false);
    verifyLocalConnectionKeys(activateContext);
    await startOnboarding(activateContext);
    //await prepareTestExplorer(context, activateContext);

    ext.extensionVersion = getExtensionVersion();

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
    perfStats.loadEndTime = Date.now();
    activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;
  });
}

export function deactivate(): Promise<any> {
  stopAllDesignTimeApis();
  ext.unitTestController?.dispose();
  ext.telemetryReporter.dispose();
  return undefined;
}
