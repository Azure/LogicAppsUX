/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assetsFolderName, localSettingsFileName } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { getLocalSettingsJson } from '../../../../utils/appSettings/localSettings';
import {
  removeWebviewPanelFromCache,
  cacheWebviewPanel,
  getAzureConnectorDetailsForLocalProject,
  getStandardAppData,
} from '../../../../utils/codeless/common';
import {
  getConnectionsFromFile,
  getCustomCodeFromFiles,
  getLogicAppProjectRoot,
  getParametersFromFile,
} from '../../../../utils/codeless/connection';
import { sendRequest } from '../../../../utils/requestUtils';
import { createUnitTestFromRun } from '../../unitTest/createUnitTestFromRun';
import { MonitoringPanel } from './monitoringPanel';
import { getRunTriggerName, HTTP_METHODS } from '@microsoft/logic-apps-shared';
import { openUrl, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { FileDetails, DesignerPanelMetadata } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { promises, readFileSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { WebviewPanel } from 'vscode';
import { Uri, ViewColumn } from 'vscode';
import { getArtifactsInLocalProject } from '../../../../utils/codeless/artifacts';
import { getBundleVersionNumber } from '../../../../utils/bundleFeed';

export default class LocalMonitoringPanel extends MonitoringPanel {
  private projectPath: string | undefined;
  private panelMetadata?: DesignerPanelMetadata;

  constructor(context: IActionContext, runId: string, workflowFilePath: string) {
    const apiVersion = '2019-10-01-edge-preview';

    super(context, runId, workflowFilePath, true, apiVersion);
  }

  public async create(): Promise<void> {
    const existingPanel: WebviewPanel | undefined = this.getExistingPanel();

    if (existingPanel) {
      this.panel = existingPanel;
      if (!existingPanel.active) {
        existingPanel.reveal(vscode.ViewColumn.Active);
      }
      return;
    }

    this.projectPath = await getLogicAppProjectRoot(this.context, this.workflowFilePath);

    if (!this.projectPath) {
      throw new Error(localize('FunctionRootFolderError', 'Unable to determine function project root folder.'));
    }

    this.baseUrl = ext.getWorkflowRuntimeBaseUrl();
    if (!this.baseUrl) {
      throw new Error(localize('FunctionRuntimeNotStarted', 'Unable to determine function runtime base url. Please ensure the local runtime is started.'));
    }

    this.panel = vscode.window.createWebviewPanel(
      this.panelGroupKey, // Key used to reference the panel
      this.panelName, // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in.
      this.getPanelOptions()
    );
    
    this.panel.iconPath = {
      light: Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'light', 'workflow.svg')),
      dark: Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'dark', 'workflow.svg')),
    };

    // Fetch panel metadata which does all operations in parallel internally
    this.panelMetadata = await this.getDesignerPanelMetadata();

    this.panel.webview.html = await this.getWebviewContent({
      connectionsData: this.panelMetadata.connectionsData,
      parametersData: this.panelMetadata.parametersData,
      localSettings: this.panelMetadata.localSettings,
      artifacts: this.panelMetadata.artifacts,
      azureDetails: this.panelMetadata.azureDetails,
    });

    this.panelMetadata.mapArtifacts = this.mapArtifacts as Record<string, FileDetails[]>;
    this.panelMetadata.schemaArtifacts = this.schemaArtifacts as FileDetails[];
    this.context.telemetry.properties.extensionBundleVersion = this.panelMetadata.extensionBundleVersion;

    this.panel.webview.onDidReceiveMessage(
      async (message) => await this.handleWebviewMsg(message),
      /* thisArgs */ undefined,
      ext.context.subscriptions
    );

    this.panel.onDidDispose(
      () => {
        removeWebviewPanelFromCache(this.panelGroupKey, this.panelName);
      },
      null,
      ext.context.subscriptions
    );

    cacheWebviewPanel(this.panelGroupKey, this.panelName, this.panel);
    ext.context.subscriptions.push(this.panel);
  }

  private async handleWebviewMsg(message: any) {
    switch (message.command) {
      case ExtensionCommand.initialize: {
        this.panel?.webview.postMessage({
          command: ExtensionCommand.initialize_frame,
          data: {
            project: ProjectName.designer,
            panelMetadata: this.panelMetadata,
            connectionData: this.connectionData,
            oauthRedirectUrl: this.oauthRedirectUrl,
            baseUrl: this.baseUrl,
            apiVersion: this.apiVersion,
            apiHubServiceDetails: this.apiHubServiceDetails,
            readOnly: this.readOnly,
            isLocal: this.isLocal,
            isMonitoringView: this.isMonitoringView,
            runId: this.runId,
            hostVersion: ext.extensionVersion,
          },
        });
        break;
      }
      case ExtensionCommand.showContent: {
        await this.openContent(message.header, message.id, message.title, message.content);
        break;
      }
      case ExtensionCommand.resubmitRun: {
        await this.resubmitRun();
        break;
      }
      case ExtensionCommand.logTelemetry: {
        const eventName = message.data.name ?? message.data.area;
        ext.telemetryReporter.sendTelemetryEvent(eventName, { ...message.data });
        break;
      }
      case ExtensionCommand.createUnitTestFromRun: {
        await createUnitTestFromRun(vscode.Uri.file(this.workflowFilePath), message.runId, message.definition);
        break;
      }
      case ExtensionCommand.fileABug: {
        await openUrl('https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml');
        break;
      }
      case ExtensionCommand.getDesignerVersion: {
        this.panel?.webview.postMessage({
          command: ExtensionCommand.getDesignerVersion,
          data: this.getDesignerVersion(),
        });
        break;
      }
      default:
        break;
    }
  }

  private async resubmitRun(): Promise<void> {
    const options: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: localize('runResubmit', 'Resubmitting workflow run...'),
    };

    await vscode.window.withProgress(options, async () => {
      try {
        const fileContent = await promises.readFile(this.workflowFilePath, 'utf8');
        const workflowContent: any = JSON.parse(fileContent);
        const triggerName = getRunTriggerName(workflowContent.definition);
        if (!triggerName) {
          throw new Error(localize('workflowTriggerNotFound', 'Unable to determine a trigger to resubmit this workflow run.'));
        }
        const url = `${this.baseUrl}/workflows/${this.workflowName}/triggers/${triggerName}/histories/${this.runId}/resubmit?api-version=${this.apiVersion}`;

        await sendRequest(this.context, { url, method: HTTP_METHODS.POST });
      } catch (error) {
        const errorMessage = localize('runResubmitFailed', 'Workflow run resubmit failed: ') + error.message;
        await vscode.window.showErrorMessage(errorMessage, localize('OK', 'OK'));
      }
    });
  }

  private async getDesignerPanelMetadata(): Promise<DesignerPanelMetadata> {
    const projectPath: string | undefined = await getLogicAppProjectRoot(this.context, this.workflowFilePath);

    if (!projectPath) {
      throw new Error(localize('FunctionRootFolderError', 'Unable to determine function project root folder.'));
    }

    const [connectionsData, parametersData, customCodeData, bundleVersionNumber, azureDetails, artifacts, workflowContent] =
      await Promise.all([
        getConnectionsFromFile(this.context, this.workflowFilePath),
        getParametersFromFile(this.context, this.workflowFilePath),
        getCustomCodeFromFiles(this.workflowFilePath),
        getBundleVersionNumber(projectPath),
        getAzureConnectorDetailsForLocalProject(this.context, projectPath),
        getArtifactsInLocalProject(projectPath),
        this.getWorkflowContent(),
      ]);

    const localSettings = (await getLocalSettingsJson(this.context, path.join(projectPath, localSettingsFileName))).Values!;

    return {
      panelId: this.panelName,
      appSettingNames: Object.keys(localSettings),
      connectionsData,
      localSettings,
      parametersData,
      customCodeData,
      azureDetails,
      accessToken: azureDetails.accessToken,
      workflowName: this.workflowName,
      workflowDetails: {},
      artifacts,
      standardApp: getStandardAppData(this.workflowName, { ...workflowContent, definition: {} }),
      schemaArtifacts: this.schemaArtifacts as FileDetails[],
      mapArtifacts: this.mapArtifacts as Record<string, FileDetails[]>,
      extensionBundleVersion: bundleVersionNumber,
    };
  }

  private async getWorkflowContent(): Promise<any> {
    if (!this.workflowFilePath.endsWith('.cs')) {
      return JSON.parse(readFileSync(this.workflowFilePath, 'utf8'));
    }

    try {
      const runUrl = `${this.baseUrl}/workflows/${this.workflowName}/runs/${this.runId}?api-version=${this.apiVersion}`;
      const runResponse: string = await sendRequest(this.context, {
        url: runUrl,
        method: HTTP_METHODS.GET,
      });
      const runData = JSON.parse(runResponse);

      if (runData.properties?.workflow?.properties?.definition) {
        return {
          definition: runData.properties.workflow.properties.definition,
          kind: runData.properties.workflow.properties.kind || 'Stateful',
        };
      }
    } catch {
      // Codeful run data can be unavailable while the local runtime is starting.
    }

    return { definition: {}, kind: 'Stateful' };
  }
}
