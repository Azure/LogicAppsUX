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
import { convertToWorkspace } from './app/commands/createNewCodeProject/CodeProjectBase/ConvertToWorkspace';
import TelemetryReporter from '@vscode/extension-telemetry';
import { buildCodeProjects } from './app/commands/createNewCodeProject/CodeProjectBase/BuildCodeProjects';

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

  ext.context = context;
  ext.telemetryReporter = new TelemetryReporter(telemetryString);
  context.subscriptions.push(ext.telemetryReporter);

  ext.outputChannel = createAzExtOutputChannel('Azure Logic Apps (Standard)', ext.prefix);
  registerUIExtensionVariables(ext);
  registerAppServiceExtensionVariables(ext);

  await callWithTelemetryAndErrorHandling(extensionCommand.activate, async (activateContext: IActionContext) => {
    activateContext.telemetry.properties.isActivationEvent = 'true';
    activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

    runPostWorkflowCreateStepsFromCache();
    runPostExtractStepsFromCache();

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      await convertToWorkspace(activateContext);
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

    await buildCodeProjects(activateContext);

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
  ext.telemetryReporter.dispose();
  return undefined;
}

perfStats.loadEndTime = Date.now();
