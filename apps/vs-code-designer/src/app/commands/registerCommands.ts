/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand } from '../../constants';
import { ext } from '../../extensionVariables';
import { executeOnFunctions } from '../functionsExtension/executeOnFunctionsExt';
import { LogicAppResourceTree } from '../tree/LogicAppResourceTree';
import { downloadAppSettings } from './appSettings/downloadAppSettings';
import { editAppSetting } from './appSettings/editAppSetting';
import { renameAppSetting } from './appSettings/renameAppSetting';
import { toggleSlotSetting } from './appSettings/toggleSlotSetting';
import { uploadAppSettings } from './appSettings/uploadAppSettings';
import { disableValidateAndInstallBinaries, resetValidateAndInstallBinaries } from './binaries/resetValidateAndInstallBinaries';
import { validateAndInstallBinaries } from './binaries/validateAndInstallBinaries';
import { browseWebsite } from './browseWebsite';
import { buildCustomCodeFunctionsProject } from './buildCustomCodeFunctionsProject';
import { configureDeploymentSource } from './configureDeploymentSource';
import { createChildNode } from './createChildNode';
import { createLogicApp, createLogicAppAdvanced } from './createLogicApp/createLogicApp';
import { cloudToLocalCommand } from './createNewCodeProject/cloudToLocal';
import { createNewCodeProjectFromCommand } from './createNewCodeProject/createNewCodeProject';
import { createNewProjectFromCommand } from './createNewProject/createNewProject';
import { createCustomCodeFunctionFromCommand } from './createCustomCodeFunction/createCustomCodeFunction';
import { createSlot } from './createSlot';
import { createWorkflow } from './createWorkflow/createWorkflow';
import { createNewDataMapCmd, loadDataMapFileCmd } from './dataMapper/dataMapper';
import { deleteLogicApp } from './deleteLogicApp/deleteLogicApp';
import { deleteNode } from './deleteNode';
import { deployProductionSlot, deploySlot } from './deploy/deploy';
import { connectToGitHub } from './deployments/connectToGitHub';
import { disconnectRepo } from './deployments/disconnectRepo';
import { redeployDeployment } from './deployments/redeployDeployment';
import { viewCommitInGitHub } from './deployments/viewCommitInGitHub';
import { viewDeploymentLogs } from './deployments/viewDeploymentLogs';
import { generateDeploymentScripts } from './generateDeploymentScripts/generateDeploymentScripts';
import { initProjectForVSCode } from './initProjectForVSCode/initProjectForVSCode';
import { startStreamingLogs } from './logstream/startStreamingLogs';
import { stopStreamingLogs } from './logstream/stopStreamingLogs';
import { openFile } from './openFile';
import { openInPortal } from './openInPortal';
import { parameterizeConnections } from './parameterizeConnections';
import { pickFuncProcess } from './pickFuncProcess';
import { startRemoteDebug } from './remoteDebug/startRemoteDebug';
import { restartLogicApp } from './restartLogicApp';
import { startLogicApp } from './startLogicApp';
import { stopLogicApp } from './stopLogicApp';
import { swapSlot } from './swapSlot';
import { viewProperties } from './viewProperties';
import { configureWebhookRedirectEndpoint } from './workflows/configureWebhookRedirectEndpoint/configureWebhookRedirectEndpoint';
import { enableAzureConnectors } from './workflows/enableAzureConnectors';
import { exportLogicApp } from './workflows/exportLogicApp';
import { openDesigner } from './workflows/openDesigner/openDesigner';
import { openOverview } from './workflows/openOverview';
import { reviewValidation } from './workflows/reviewValidation';
import { switchDebugMode } from './workflows/switchDebugMode/switchDebugMode';
import { switchToDotnetProjectCommand } from './workflows/switchToDotnetProject';
import { useSQLStorage } from './workflows/useSQLStorage';
import { viewContent } from './workflows/viewContent';
import { registerSiteCommand, type FileTreeItem } from '@microsoft/vscode-azext-azureappservice';
import {
  parseError,
  registerCommand,
  registerCommandWithTreeNodeUnwrapping,
  registerErrorHandler,
  registerReportIssueCommand,
  unwrapTreeNodeCommandCallback,
  UserCancelledError,
} from '@microsoft/vscode-azext-utils';
import type { AzExtTreeItem, IActionContext, AzExtParentTreeItem, IErrorHandlerContext, IParsedError } from '@microsoft/vscode-azext-utils';
import type { Uri } from 'vscode';
import { pickCustomCodeNetHostProcess } from './pickCustomCodeNetHostProcess';
import { debugLogicApp } from './debugLogicApp';
import { syncCloudSettings } from './syncCloudSettings';
import { getDebugSymbolDll } from '../utils/getDebugSymbolDll';
import { AppSettingsTreeItem, AppSettingTreeItem } from '@microsoft/vscode-azext-azureappsettings';
import { switchToDataMapperV2 } from './setDataMapperVersion';
import { reportAnIssue } from '../utils/reportAnIssue';

export function registerCommands(): void {
  registerCommandWithTreeNodeUnwrapping(extensionCommand.openDesigner, openDesigner);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.openFile, (context: IActionContext, node: FileTreeItem) =>
    executeOnFunctions(openFile, context, context, node)
  );
  registerCommandWithTreeNodeUnwrapping(extensionCommand.viewContent, viewContent);
  registerCommand(extensionCommand.createNewProject, createNewProjectFromCommand);
  registerCommand(extensionCommand.createNewWorkspace, createNewCodeProjectFromCommand);
  registerCommand(extensionCommand.cloudToLocal, cloudToLocalCommand);
  registerCommand(extensionCommand.createWorkflow, createWorkflow);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.createLogicApp, createLogicApp);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.createLogicAppAdvanced, createLogicAppAdvanced);
  registerSiteCommand(extensionCommand.deploy, unwrapTreeNodeCommandCallback(deployProductionSlot));
  registerSiteCommand(extensionCommand.deploySlot, unwrapTreeNodeCommandCallback(deploySlot));
  registerCommand(extensionCommand.generateDeploymentScripts, generateDeploymentScripts);
  registerSiteCommand(extensionCommand.redeploy, unwrapTreeNodeCommandCallback(redeployDeployment));
  registerCommandWithTreeNodeUnwrapping(extensionCommand.showOutputChannel, () => {
    ext.outputChannel.show();
  });
  registerCommandWithTreeNodeUnwrapping(extensionCommand.startLogicApp, startLogicApp);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.stopLogicApp, stopLogicApp);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.restartLogicApp, restartLogicApp);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.pickProcess, pickFuncProcess);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.pickCustomCodeNetHostProcess, pickCustomCodeNetHostProcess);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.getDebugSymbolDll, getDebugSymbolDll);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.deleteLogicApp, deleteLogicApp);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.openOverview, openOverview);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.exportLogicApp, exportLogicApp);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.reviewValidation, reviewValidation);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.switchToDotnetProject, switchToDotnetProjectCommand);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.openInPortal, openInPortal);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.browseWebsite, browseWebsite);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.viewProperties, viewProperties);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.createSlot, createSlot);
  registerCommandWithTreeNodeUnwrapping(
    extensionCommand.deleteSlot,
    async (context: IActionContext, node?: AzExtTreeItem) => await deleteNode(context, LogicAppResourceTree.pickSlotContextValue, node)
  );
  registerCommandWithTreeNodeUnwrapping(extensionCommand.swapSlot, swapSlot);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.startStreamingLogs, startStreamingLogs);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.stopStreamingLogs, stopStreamingLogs);
  registerSiteCommand(extensionCommand.viewDeploymentLogs, unwrapTreeNodeCommandCallback(viewDeploymentLogs));
  registerCommandWithTreeNodeUnwrapping(extensionCommand.switchDebugMode, switchDebugMode);
  registerCommandWithTreeNodeUnwrapping(
    extensionCommand.toggleAppSettingVisibility,
    async (context: IActionContext, node: AppSettingTreeItem) => {
      await node.toggleValueVisibility(context);
    },
    250
  );
  registerCommandWithTreeNodeUnwrapping(
    extensionCommand.appSettingsAdd,
    async (context: IActionContext, node?: AzExtParentTreeItem) => await createChildNode(context, AppSettingsTreeItem.contextValue, node)
  );
  registerCommandWithTreeNodeUnwrapping(
    extensionCommand.appSettingsDelete,
    async (context: IActionContext, node?: AzExtTreeItem) => await deleteNode(context, AppSettingTreeItem.contextValue, node)
  );
  registerCommandWithTreeNodeUnwrapping(extensionCommand.appSettingsDownload, downloadAppSettings);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.appSettingsEdit, editAppSetting);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.appSettingsRename, renameAppSetting);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.appSettingsToggleSlotSetting, toggleSlotSetting);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.appSettingsUpload, async (context: IActionContext, node?: AppSettingsTreeItem) => {
    await uploadAppSettings(context, node);
  });
  registerCommandWithTreeNodeUnwrapping(extensionCommand.syncCloudSettings, syncCloudSettings);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.configureWebhookRedirectEndpoint, configureWebhookRedirectEndpoint);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.useSQLStorage, useSQLStorage);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.connectToGitHub, connectToGitHub);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.disconnectRepo, disconnectRepo);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.viewCommitInGitHub, viewCommitInGitHub);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.enableAzureConnectors, enableAzureConnectors);
  registerCommand(extensionCommand.initProjectForVSCode, initProjectForVSCode);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.configureDeploymentSource, configureDeploymentSource);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.startRemoteDebug, startRemoteDebug);
  registerCommand(extensionCommand.parameterizeConnections, parameterizeConnections);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.validateAndInstallBinaries, validateAndInstallBinaries);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.resetValidateAndInstallBinaries, resetValidateAndInstallBinaries);
  registerCommandWithTreeNodeUnwrapping(extensionCommand.disableValidateAndInstallBinaries, disableValidateAndInstallBinaries);
  // Data Mapper Commands
  registerCommand(extensionCommand.createNewDataMap, (context: IActionContext) => createNewDataMapCmd(context));
  registerCommand(extensionCommand.loadDataMapFile, (context: IActionContext, uri: Uri) => loadDataMapFileCmd(context, uri));
  // Custom code commands
  registerCommandWithTreeNodeUnwrapping(extensionCommand.buildCustomCodeFunctionsProject, buildCustomCodeFunctionsProject);
  registerCommand(extensionCommand.createCustomCodeFunction, createCustomCodeFunctionFromCommand);
  registerCommand(extensionCommand.debugLogicApp, debugLogicApp);
  registerCommand(extensionCommand.switchToDataMapperV2, switchToDataMapperV2);

  // Suppress "Report an Issue" button for all errors in favor of the command

  registerErrorHandler((errorContext: IErrorHandlerContext): void => {
    // Log error even when suppressDisplay is on
    const errorData: IParsedError = parseError(errorContext.error);

    if (errorContext.errorHandling.suppressDisplay ?? false) {
      console.log(`Error: ${errorData.message}${errorData.stack ? `\nStack: ${errorData.stack}` : ''}`);
    }

    if (errorContext.error instanceof UserCancelledError) {
      errorContext.errorHandling.suppressDisplay = true;
      errorContext.telemetry.properties.isUserCancelled = 'true';
      errorContext.telemetry.properties.commandName = errorContext.error.name;
    }

    errorContext.errorHandling.buttons = [
      {
        title: 'Open Extension',
        callback: async () => reportAnIssue(errorContext, errorData),
      },
    ];

    // c.errorHandling.suppressReportIssue = true;
    // c.errorHandling.issueProperties = {
    //   extensionVersion: ext.extensionVersion,
    //   bundleVersion: ext.latestBundleVersion,
    // }
  });
  registerReportIssueCommand(extensionCommand.reportIssue);
}
