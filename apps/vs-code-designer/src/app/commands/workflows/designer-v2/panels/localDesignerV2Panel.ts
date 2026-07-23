/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  assetsFolderName,
  localSettingsFileName,
  logicAppsStandardExtensionId,
  managementApiPrefix,
  workflowAppApiVersion,
} from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { getLocalSettingsJson } from '../../../../utils/appSettings/localSettings';
import { getArtifactsInLocalProject } from '../../../../utils/codeless/artifacts';
import {
  cacheWebviewPanel,
  getAzureConnectorDetailsForLocalProject,
  getManualWorkflowsInLocalProject,
  getStandardAppData,
  removeWebviewPanelFromCache,
} from '../../../../utils/codeless/common';
import {
  addConnectionData,
  getConnectionsAndSettingsToUpdate,
  getConnectionsFromFile,
  getCustomCodeFromFiles,
  getCustomCodeToUpdate,
  getLogicAppProjectRoot,
  getParametersFromFile,
  saveConnectionReferences,
  saveCustomCodeStandard,
} from '../../../../utils/codeless/connection';
import { getAuthorizationToken } from '../../../../utils/codeless/getAuthorizationToken';
import { saveWorkflowParameter } from '../../../../utils/codeless/parameter';
import { startDesignTimeApi } from '../../../../utils/codeless/startDesignTimeApi';
import { sendRequest } from '../../../../utils/requestUtils';
import { createNewDataMapCmd } from '../../../dataMapper/dataMapper';
import { DesignerV2Panel } from './designerV2Panel';
import { getMigrationOptions, migrateWorkflow } from '../../designer/utils/migration';
import { createFileSystemConnection } from '../../designer/utils/fileSystemConnection';
import { mergeJsonParameters } from '../../designer/utils/parameterMerge';
import { getRunTriggerName, HTTP_METHODS } from '@microsoft/logic-apps-shared';
import { callWithTelemetryAndErrorHandling, openUrl, type IActionContext } from '@microsoft/vscode-azext-utils';
import type {
  CompleteFileSystemConnectionData,
  FileDetails,
  DesignerPanelMetadata,
  Parameter,
} from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { writeFileSync, readFileSync } from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { env, ProgressLocation, Uri, ViewColumn, window, workspace } from 'vscode';
import type { WebviewPanel, ProgressOptions } from 'vscode';
import { createUnitTest } from '../../unitTest/createUnitTest';
import { createUnitTestFromRun } from '../../unitTest/createUnitTestFromRun';
import { getBundleVersionNumber } from '../../../../utils/bundleFeed';

export default class LocalDesignerV2Panel extends DesignerV2Panel {
  private readonly workflowFilePath: string;
  private migrationOptions?: Record<string, any>;
  private projectPath?: string;
  private panelMetadata?: DesignerPanelMetadata;
  private workflowRuntimeBaseUrlInterval?: NodeJS.Timeout;
  private accessTokenInterval?: NodeJS.Timeout;

  constructor(context: IActionContext, node: Uri, runId?: string) {
    const workflowFilePath = node.fsPath;
    const workflowName = path.basename(path.dirname(workflowFilePath));
    const logicAppName = path.basename(path.dirname(path.dirname(workflowFilePath)));
    const panelName = `${workspace.name}-${logicAppName}-${workflowName}`;
    const panelGroupKey = ext.webViewKey.designerLocalV2;

    super(context, workflowName, panelName, workflowAppApiVersion, panelGroupKey, true, runId);

    this.workflowFilePath = workflowFilePath;
  }

  public async create(): Promise<void> {
    const existingPanel: WebviewPanel | undefined = this.getExistingPanel();

    if (existingPanel) {
      this.panel = existingPanel;
      if (!existingPanel.active) {
        existingPanel.reveal(ViewColumn.Active);
      }
      if (this.runId) {
        this.selectRun(this.runId);
      }
      return;
    }

    this.projectPath = await getLogicAppProjectRoot(this.context, this.workflowFilePath);
    if (!this.projectPath) {
      throw new Error(localize('projectPathUndefined', 'Unable to determine project root folder.'));
    }

    await startDesignTimeApi(this.projectPath);

    const designTimeInstance = ext.designTimeInstances.get(this.projectPath);
    if (!designTimeInstance) {
      throw new Error(localize('designTimeNotRunning', `Design time is not running for project ${this.projectPath}.`));
    }
    if (designTimeInstance.startupError) {
      throw new Error(
        localize(
          'designTimeStartupFailed',
          'Design time failed to start for project {0}. {1}',
          this.projectPath,
          designTimeInstance.startupError
        )
      );
    }

    const designTimePort = designTimeInstance.port;
    if (!designTimePort) {
      throw new Error(localize('designTimePortNotFound', 'Design time port not found.'));
    }

    this.baseUrl = `http://localhost:${designTimePort}${managementApiPrefix}`;
    this.workflowRuntimeBaseUrl = ext.getWorkflowRuntimeBaseUrl();

    this.panel = window.createWebviewPanel(this.panelGroupKey, this.panelName, ViewColumn.Active, this.getPanelOptions());
    this.panel.iconPath = {
      light: Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'light', 'workflow.svg')),
      dark: Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'dark', 'workflow.svg')),
    };

    this.migrationOptions = await getMigrationOptions(this.baseUrl);
    this.panelMetadata = await this.getDesignerPanelMetadata(this.migrationOptions);
    const callbackUri: Uri = await (env as any).asExternalUri(Uri.parse(`${env.uriScheme}://${logicAppsStandardExtensionId}/authcomplete`));
    this.context.telemetry.properties.extensionBundleVersion = this.panelMetadata.extensionBundleVersion;
    this.oauthRedirectUrl = callbackUri.toString(true);

    this.panel.webview.html = await this.getWebviewContent({
      connectionsData: this.panelMetadata.connectionsData,
      parametersData: this.panelMetadata.parametersData || {},
      localSettings: this.panelMetadata.localSettings,
      artifacts: this.panelMetadata.artifacts,
      azureDetails: this.panelMetadata.azureDetails,
      workflowDetails: this.panelMetadata.workflowDetails,
    });

    this.panelMetadata.mapArtifacts = this.mapArtifacts as Record<string, FileDetails[]>;
    this.panelMetadata.schemaArtifacts = this.schemaArtifacts as FileDetails[];

    this.panel.webview.onDidReceiveMessage(async (message) => await this.handleWebviewMsg(message), ext.context.subscriptions);

    this.panel.onDidChangeViewState(
      async (event) => {
        const eventPanel: WebviewPanel = event.webviewPanel;
        if (eventPanel.visible) {
          await this.reloadWebviewPanel(eventPanel);
        }
      },
      undefined,
      ext.context.subscriptions
    );

    this.panel.onDidDispose(
      () => {
        clearInterval(this.workflowRuntimeBaseUrlInterval);
        clearInterval(this.accessTokenInterval);
        removeWebviewPanelFromCache(this.panelGroupKey, this.panelName);
      },
      null,
      ext.context.subscriptions
    );

    cacheWebviewPanel(this.panelGroupKey, this.panelName, this.panel);
    ext.context.subscriptions.push(this.panel);

    this.showDesignerVersionNotification();
  }

  // region Message Handling

  private async handleWebviewMsg(msg: any) {
    switch (msg.command) {
      case ExtensionCommand.initialize: {
        clearInterval(this.workflowRuntimeBaseUrlInterval);
        this.workflowRuntimeBaseUrlInterval = setInterval(async () => {
          const updatedRuntimeBaseUrl = ext.getWorkflowRuntimeBaseUrl();

          if (updatedRuntimeBaseUrl !== this.workflowRuntimeBaseUrl) {
            this.workflowRuntimeBaseUrl = updatedRuntimeBaseUrl;
            this.panel?.webview.postMessage({
              command: ExtensionCommand.update_runtime_base_url,
              data: {
                baseUrl: this.workflowRuntimeBaseUrl,
              },
            });
          }
        }, 3000);

        // Refresh access token periodically to prevent stale-token failures on save
        this.accessTokenInterval = setInterval(async () => {
          try {
            const tenantId = this.panelMetadata?.azureDetails?.tenantId;
            const updatedAccessToken = await getAuthorizationToken(tenantId);
            // Guard against "Bearer undefined" — only update if we got a real token
            if (updatedAccessToken && !updatedAccessToken.endsWith('undefined') && updatedAccessToken !== this.panelMetadata?.accessToken) {
              if (this.panelMetadata) {
                this.panelMetadata.accessToken = updatedAccessToken;
              }
              this.panel?.webview.postMessage({
                command: ExtensionCommand.update_access_token,
                data: {
                  accessToken: updatedAccessToken,
                },
              });
            }
          } catch {
            // Silently ignore token refresh failures — the existing token may still be valid
          }
        }, 30000);

        this.panel?.webview.postMessage({
          command: ExtensionCommand.initialize_frame,
          data: {
            project: ProjectName.designer,
            panelMetadata: this.panelMetadata,
            connectionData: this.connectionData,
            baseUrl: this.baseUrl,
            workflowRuntimeBaseUrl: this.workflowRuntimeBaseUrl,
            apiVersion: this.apiVersion,
            apiHubServiceDetails: this.apiHubServiceDetails,
            readOnly: this.readOnly,
            isLocal: this.isLocal,
            isMonitoringView: this.isMonitoringView,
            oauthRedirectUrl: this.oauthRedirectUrl,
            hostVersion: ext.extensionVersion,
            runId: this.runId,
          },
        });
        break;
      }

      // Designer commands
      case ExtensionCommand.save: {
        await callWithTelemetryAndErrorHandling('SaveWorkflowFromDesigner', async (activateContext: IActionContext) => {
          if (!this.panelMetadata) {
            window.showErrorMessage('Failed to save workflow. Panel metadata is not available.');
            return;
          }
          await this.saveWorkflow(
            activateContext,
            this.workflowFilePath,
            this.panelMetadata.workflowContent,
            msg,
            this.panelMetadata.parametersData,
            this.panelMetadata.azureDetails?.tenantId,
            this.panelMetadata.azureDetails?.workflowManagementBaseUrl
          );
        });
        break;
      }

      case ExtensionCommand.createUnitTest: {
        await createUnitTest(Uri.file(this.workflowFilePath), msg.definition);
        break;
      }

      case ExtensionCommand.addConnection: {
        await callWithTelemetryAndErrorHandling('AddConnectionFromDesigner', async (activateContext: IActionContext) => {
          await addConnectionData(activateContext, this.workflowFilePath, msg.connectionAndSetting);
        });
        break;
      }

      case ExtensionCommand.openOauthLoginPopup: {
        await env.openExternal(msg.url);
        break;
      }

      case ExtensionCommand.createFileSystemConnection: {
        const connectionName = msg.connectionName;
        const { connection, errorMessage } = await createFileSystemConnection(msg.connectionInfo);
        const completeData: CompleteFileSystemConnectionData = {
          connectionName,
          connection,
          error: errorMessage,
        };
        this.panel?.webview.postMessage({
          command: ExtensionCommand.completeFileSystemConnection,
          data: completeData,
        });
        break;
      }

      case ExtensionCommand.openRelativeLink: {
        if (msg.content === '/dataMapper') {
          createNewDataMapCmd(this.context);
        }
        break;
      }

      // Monitoring commands
      case ExtensionCommand.showContent: {
        await this.openContent(msg.header, msg.id, msg.title, msg.content);
        break;
      }

      case ExtensionCommand.resubmitRun: {
        await this.resubmitRun(msg.runId);
        break;
      }

      case ExtensionCommand.createUnitTestFromRun: {
        await createUnitTestFromRun(Uri.file(this.workflowFilePath), msg.runId, msg.definition);
        break;
      }

      // Shared commands
      case ExtensionCommand.logTelemetry: {
        const eventName = msg.data.name ?? msg.data.area;
        ext.telemetryReporter.sendTelemetryEvent(eventName, { ...msg.data });
        break;
      }

      case ExtensionCommand.fileABug: {
        await openUrl('https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml');
        break;
      }

      case ExtensionCommand.getDesignerVersion: {
        this.panel?.webview.postMessage({
          command: ExtensionCommand.getDesignerVersion,
          data: 2,
        });
        break;
      }

      default:
        break;
    }
  }

  // endregion

  // region Monitoring

  private async resubmitRun(runId?: string): Promise<void> {
    const currentRunId = runId ?? this.runId;
    if (!currentRunId) {
      window.showErrorMessage(localize('noRunId', 'No run ID available for resubmit.'));
      return;
    }

    const options: ProgressOptions = {
      location: ProgressLocation.Notification,
      title: localize('runResubmit', 'Resubmitting workflow run...'),
    };

    await window.withProgress(options, async () => {
      const runtimeBaseUrl = this.workflowRuntimeBaseUrl ?? this.baseUrl;
      try {
        const fileContent = await fsPromises.readFile(this.workflowFilePath, 'utf8');
        const workflowContent: any = JSON.parse(fileContent);
        const triggerName = getRunTriggerName(workflowContent.definition);
        if (!triggerName) {
          throw new Error(localize('workflowTriggerNotFound', 'Unable to determine a trigger to resubmit this workflow run.'));
        }
        const url = `${runtimeBaseUrl}/workflows/${this.workflowName}/triggers/${triggerName}/histories/${currentRunId}/resubmit?api-version=${this.apiVersion}`;

        await sendRequest(this.context, { url, method: HTTP_METHODS.POST });
      } catch (error) {
        const errorMessage = localize('runResubmitFailed', 'Workflow run resubmit failed: ') + error.message;
        await window.showErrorMessage(errorMessage, localize('OK', 'OK'));
      }
    });
  }

  // endregion

  // region Workflow utilities

  private async saveWorkflow(
    context: IActionContext,
    filePath: string,
    workflow: any,
    workflowToSave: any,
    panelParameterRecord: Record<string, Parameter>,
    azureTenantId?: string,
    workflowBaseManagementUri?: string
  ): Promise<void> {
    const options: ProgressOptions = {
      location: ProgressLocation.Notification,
      title: localize('azureFunctions.savingWorkflow', 'Saving Workflow...'),
    };

    await window.withProgress(options, async () => {
      try {
        const { definition, connectionReferences, parameters, customCodeData } = workflowToSave;
        const definitionToSave: any = definition;
        const parametersFromDefinition = parameters;
        const projectPath = await getLogicAppProjectRoot(this.context, filePath);

        workflow.definition = definitionToSave;

        if (connectionReferences) {
          const connectionsAndSettingsToUpdate = await getConnectionsAndSettingsToUpdate(
            this.context,
            projectPath,
            connectionReferences,
            azureTenantId,
            workflowBaseManagementUri,
            parametersFromDefinition
          );

          await saveConnectionReferences(this.context, projectPath, connectionsAndSettingsToUpdate);
        }

        if (customCodeData) {
          const customCodeToUpdate = await getCustomCodeToUpdate(this.context, filePath, customCodeData);
          await saveCustomCodeStandard(filePath, customCodeToUpdate);
        }

        if (parametersFromDefinition) {
          delete parametersFromDefinition.$connections;
          for (const parameterKey of Object.keys(parametersFromDefinition)) {
            const parameter = parametersFromDefinition[parameterKey];
            parameter.value = parameter.value ?? parameter.defaultValue;
            delete parameter.defaultValue;
          }
          await mergeJsonParameters(this.context, filePath, parametersFromDefinition, panelParameterRecord);
          await saveWorkflowParameter(this.context, filePath, parametersFromDefinition);
        }

        writeFileSync(filePath, JSON.stringify(workflow, null, 4));
        this.panel?.webview.postMessage({
          command: ExtensionCommand.resetDesignerDirtyState,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
        const errorLocalized = `${localize('saveFailure', 'Workflow not saved.')} ${errorMessage}`;
        context.telemetry.properties.saveWorkflowError = errorLocalized;
        window.showErrorMessage(errorLocalized, localize('OK', 'OK'));
        throw error;
      }
    });
  }

  private async getDesignerPanelMetadata(migrationOptions: Record<string, any> = {}): Promise<DesignerPanelMetadata> {
    const projectPath: string | undefined = await getLogicAppProjectRoot(this.context, this.workflowFilePath);
    if (!projectPath) {
      throw new Error(localize('FunctionRootFolderError', 'Unable to determine function project root folder.'));
    }

    const workflowContent: any = JSON.parse(readFileSync(this.workflowFilePath, 'utf8'));
    migrateWorkflow(workflowContent, migrationOptions);

    const [connectionsData, parametersData, customCodeData, workflowDetails, artifacts, bundleVersionNumber, azureDetails] =
      await Promise.all([
        getConnectionsFromFile(this.context, this.workflowFilePath),
        getParametersFromFile(this.context, this.workflowFilePath),
        getCustomCodeFromFiles(this.workflowFilePath),
        getManualWorkflowsInLocalProject(projectPath, this.workflowName),
        getArtifactsInLocalProject(projectPath),
        getBundleVersionNumber(projectPath),
        getAzureConnectorDetailsForLocalProject(this.context, projectPath),
      ]);

    const localSettings = (await getLocalSettingsJson(this.context, path.join(projectPath, localSettingsFileName))).Values!;

    return {
      panelId: this.panelName,
      appSettingNames: Object.keys(localSettings),
      standardApp: getStandardAppData(this.workflowName, workflowContent),
      connectionsData,
      customCodeData,
      parametersData,
      localSettings,
      azureDetails,
      accessToken: azureDetails.accessToken,
      workflowContent,
      workflowDetails,
      workflowName: this.workflowName,
      artifacts,
      schemaArtifacts: this.schemaArtifacts as FileDetails[],
      mapArtifacts: this.mapArtifacts as Record<string, FileDetails[]>,
      extensionBundleVersion: bundleVersionNumber,
    };
  }

  private async reloadWebviewPanel(webviewPanel: WebviewPanel): Promise<void> {
    this.panelMetadata = await this.getDesignerPanelMetadata(this.migrationOptions);
    webviewPanel.webview.html = await this.getWebviewContent({
      connectionsData: this.panelMetadata.connectionsData,
      parametersData: this.panelMetadata.parametersData || {},
      localSettings: this.panelMetadata.localSettings,
      artifacts: this.panelMetadata.artifacts,
      azureDetails: this.panelMetadata.azureDetails,
      workflowDetails: this.panelMetadata.workflowDetails,
    });
    this.panel?.webview.postMessage({
      command: ExtensionCommand.update_panel_metadata,
      data: {
        panelMetadata: this.panelMetadata,
        connectionData: this.connectionData,
        apiHubServiceDetails: this.apiHubServiceDetails,
      },
    });
  }

  // endregion
}
