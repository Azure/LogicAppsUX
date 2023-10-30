import { LogicAppResolver } from './LogicAppResolver';
import { runPostWorkflowCreateStepsFromCache } from './app/commands/createCodeless/createCodelessSteps/WorkflowCreateStepBase';
import { stopDataMapperBackend } from './app/commands/dataMapper/FxWorkflowRuntime';
import { supportedDataMapDefinitionFileExts, supportedSchemaFileExts } from './app/commands/dataMapper/extensionConfig';
import { validateFuncCoreToolsIsLatest } from './app/commands/funcCoreTools/validateFuncCoreToolsIsLatest';
import { registerCommands } from './app/commands/registerCommands';
import { getResourceGroupsApi } from './app/resourcesExtension/getExtensionApi';
import type { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { stopDesignTimeApi } from './app/utils/codeless/startDesignTimeApi';
import { UriHandler } from './app/utils/codeless/urihandler';
import { getExtensionVersion } from './app/utils/extension';
import { registerFuncHostTaskEvents } from './app/utils/funcCoreTools/funcHostTask';
import { tryGetFunctionProjectRoot } from './app/utils/verifyIsProject';
import { verifyVSCodeConfigOnActivate } from './app/utils/vsCodeConfig/verifyVSCodeConfigOnActivate';
import { extensionCommand, logicAppFilter } from './constants';
import { ext } from './extensionVariables';
import { registerAppServiceExtensionVariables } from '@microsoft/vscode-azext-azureappservice';
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

const perfStats = {
  loadStartTime: Date.now(),
  loadEndTime: undefined,
};

export async function activate(context: vscode.ExtensionContext) {
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

  ext.context = context;

  ext.outputChannel = createAzExtOutputChannel('Azure Logic Apps (Standard)', ext.prefix);

  registerUIExtensionVariables(ext);
  registerAppServiceExtensionVariables(ext);

  await callWithTelemetryAndErrorHandling(extensionCommand.activate, async (activateContext: IActionContext) => {
    activateContext.telemetry.properties.isActivationEvent = 'true';
    activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

    runPostWorkflowCreateStepsFromCache();
    validateFuncCoreToolsIsLatest();

    ext.extensionVersion = getExtensionVersion();
    ext.rgApi = await getResourceGroupsApi();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ext.azureAccountTreeItem = ext.rgApi.appResourceTree._rootTreeItem as AzureAccountTreeItemWithProjects;

    //TODO - Elaina: seperate as a helper function
    // console.log("---Elaina. in main.ts. vscode.workspace.workspaceFolders: ", vscode.workspace.workspaceFolders)
    // if (vscode.workspace.workspaceFolders) {
    //   vscode.workspace.workspaceFolders.forEach(async (workspaceFolder) => {
    //     if (await isFunctionProject(workspaceFolder.uri.fsPath)) {
    //       ext.logicAppWorkspace = workspaceFolder.uri.fsPath;
    //     }
    //   });
    //   if (!ext.logicAppWorkspace) {
    //     ext.logicAppWorkspace = vscode.workspace.workspaceFolders[0].uri.fsPath;
    //   }
    // } else {
    //   ext.showError(localize('MissingWorkspace', 'No VS Code folder/workspace found...'));
    // }

    await callWithTelemetryAndErrorHandling('TODO Elaina change', async (context: IActionContext) => {
      console.log('---Elaina. in main.ts. callWithTelemetryAndErrorHandling');
      //TODO Elaina - ?.?.?. it
      console.log(
        '---Elaina. in main.ts. vscode.workspace.workspaceFolders[0].uri.fsPath ',
        vscode.workspace.workspaceFolders[0].uri.fsPath
      );
      const logicAppFolder = await tryGetFunctionProjectRoot(context, vscode.workspace.workspaceFolders[0].uri.fsPath, false);
      console.log('---Elaina. in main.ts. logicAppFolder: ', logicAppFolder);
      ext.logicAppWorkspace = logicAppFolder;
    });

    console.log('---Elaina. in main.ts. after callWithTelemetryAndErrorHandling: ', ext.logicAppWorkspace);

    callWithTelemetryAndErrorHandling(extensionCommand.validateLogicAppProjects, async (actionContext: IActionContext) => {
      await verifyVSCodeConfigOnActivate(actionContext, vscode.workspace.workspaceFolders);
    });

    registerEvent(
      extensionCommand.validateLogicAppProjects,
      vscode.workspace.onDidChangeWorkspaceFolders,
      async (actionContext: IActionContext, event: vscode.WorkspaceFoldersChangeEvent) => {
        await verifyVSCodeConfigOnActivate(actionContext, event.added);
      }
    );

    context.subscriptions.push(ext.outputChannel);
    context.subscriptions.push(ext.azureAccountTreeItem);

    registerReportIssueCommand(extensionCommand.reportIssue);
    registerCommands();
    registerFuncHostTaskEvents();

    ext.rgApi.registerApplicationResourceResolver(getAzExtResourceType(logicAppFilter), new LogicAppResolver());

    vscode.window.registerUriHandler(new UriHandler());
  });
}

export function deactivate(): Promise<any> {
  stopDesignTimeApi();
  stopDataMapperBackend();
  return undefined;
}

perfStats.loadEndTime = Date.now();
