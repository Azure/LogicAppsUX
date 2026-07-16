/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assetsFolderName } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import type { RemoteWorkflowTreeItem } from '../../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../../../utils/codeless/common';
import { getWebViewHTML } from '../../../../utils/codeless/getWebViewHTML';
import { openMonitoringView } from '../../monitoringView/openMonitoringView';
import { shouldUpdateOverviewCallbackInfo } from '../../overviewCallbackInfo';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { AzureConnectorDetails, ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import * as vscode from 'vscode';
import type { OverviewWorkflowProperties } from '../utils/types';

export abstract class OverviewPanel {
  protected readonly context: IActionContext;
  protected workflowName: string;
  protected panelName: string;
  protected panelTitle: string;
  protected panelGroupKey: string;
  protected apiVersion: string;
  protected baseUrl?: string;
  protected accessToken?: string;
  protected isLocal: boolean;
  protected isCodefulOverview = false;
  protected callbackInfo?: ICallbackUrlResponse;
  protected panel?: vscode.WebviewPanel;
  protected workflowContent: any;
  protected workflowProps?: OverviewWorkflowProperties;
  protected workflowPropertiesList?: OverviewWorkflowProperties[];
  protected triggerName?: string;
  protected azureDetails?: AzureConnectorDetails;
  protected corsNotice?: string;
  protected connectionData: Record<string, any> = {};
  protected workflowFilePath?: string;

  private accessTokenInterval?: NodeJS.Timeout;
  private baseUrlInterval?: NodeJS.Timeout;

  protected constructor(
    context: IActionContext,
    workflowName: string,
    panelName: string,
    panelTitle: string,
    apiVersion: string,
    isLocal: boolean
  ) {
    this.context = context;
    this.workflowName = workflowName;
    this.panelName = panelName;
    this.panelTitle = panelTitle;
    this.apiVersion = apiVersion;
    this.isLocal = isLocal;
    this.panelGroupKey = ext.webViewKey.overview;
  }

  protected abstract initializeOverviewData(): Promise<void>;
  protected abstract getBaseUrl(): string | undefined;
  protected abstract getCallbackInfo(baseUrl: string): Promise<ICallbackUrlResponse | undefined>;
  protected abstract getAccessToken(): Promise<string>;
  protected abstract getWorkflowNode(): vscode.Uri | RemoteWorkflowTreeItem | undefined;

  public async create(): Promise<void> {
    const existingPanel = tryGetWebviewPanel(this.panelGroupKey, this.panelName);
    if (existingPanel) {
      if (!existingPanel.active) {
        existingPanel.reveal(vscode.ViewColumn.Active);
      }
      return;
    }

    await this.initializeOverviewData();

    this.panel = vscode.window.createWebviewPanel('workflowOverview', this.panelTitle, vscode.ViewColumn.Active, this.getPanelOptions());

    this.panel.iconPath = {
      light: vscode.Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'light', 'Codeless.svg')),
      dark: vscode.Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'dark', 'Codeless.svg')),
    };

    this.panel.webview.html = await getWebViewHTML('vs-code-react', this.panel);

    this.panel.webview.onDidReceiveMessage(async (message) => await this.handleWebviewMsg(message), ext.context.subscriptions);

    this.panel.onDidDispose(() => this.dispose(), null, ext.context.subscriptions);

    cacheWebviewPanel(this.panelGroupKey, this.panelName, this.panel);
  }

  protected getPanelOptions(): vscode.WebviewOptions & vscode.WebviewPanelOptions {
    return {
      enableScripts: true,
      retainContextWhenHidden: true,
    };
  }

  protected async handleWebviewMsg(message: any): Promise<void> {
    switch (message.command) {
      case ExtensionCommand.loadRun: {
        openMonitoringView(this.context, this.getWorkflowNode(), message.item.id, this.workflowFilePath);
        break;
      }
      case ExtensionCommand.initialize: {
        this.sendInitializeFrame();
        this.startAccessTokenInterval();
        this.startBaseUrlInterval();
        break;
      }
      default:
        break;
    }
  }

  protected sendInitializeFrame(): void {
    const { kind } = this.workflowProps ?? {};
    this.panel?.webview.postMessage({
      command: ExtensionCommand.initialize_frame,
      data: {
        apiVersion: this.apiVersion,
        baseUrl: this.baseUrl,
        corsNotice: this.corsNotice,
        accessToken: this.accessToken,
        workflowProperties: this.workflowProps,
        workflowPropertiesList: this.workflowPropertiesList,
        project: ProjectName.overview,
        hostVersion: ext.extensionVersion,
        isLocal: this.isLocal,
        azureDetails: this.azureDetails,
        kind: this.workflowProps?.kind ?? kind,
        isCodeful: this.isCodefulOverview,
        connectionData: this.connectionData,
      },
    });
  }

  private startAccessTokenInterval(): void {
    this.accessTokenInterval = setInterval(async () => {
      const updatedAccessToken = await this.getAccessToken();
      if (updatedAccessToken !== this.accessToken) {
        this.accessToken = updatedAccessToken;
        this.panel?.webview.postMessage({
          command: ExtensionCommand.update_access_token,
          data: {
            accessToken: this.accessToken,
          },
        });
      }
    }, 5000);
  }

  private startBaseUrlInterval(): void {
    this.baseUrlInterval = setInterval(async () => {
      await this.handleBaseUrlIntervalTick();
    }, 5000);
  }

  protected async handleBaseUrlIntervalTick(): Promise<void> {
    const updatedBaseUrl = this.getBaseUrl();

    if (updatedBaseUrl !== this.baseUrl) {
      this.baseUrl = updatedBaseUrl;
      this.panel?.webview.postMessage({
        command: ExtensionCommand.update_runtime_base_url,
        data: {
          baseUrl: this.baseUrl,
        },
      });
    }

    if (this.baseUrl) {
      await this.handleCallbackInfoUpdate(this.baseUrl);
    }
  }

  protected async handleCallbackInfoUpdate(baseUrl: string): Promise<void> {
    const updatedCallbackInfo = await this.getCallbackInfo(baseUrl);
    if (shouldUpdateOverviewCallbackInfo(this.callbackInfo, updatedCallbackInfo)) {
      this.callbackInfo = updatedCallbackInfo;
      this.panel?.webview.postMessage({
        command: ExtensionCommand.update_callback_info,
        data: {
          callbackInfo: this.callbackInfo,
        },
      });
    }
  }

  private dispose(): void {
    clearInterval(this.accessTokenInterval);
    clearInterval(this.baseUrlInterval);
    removeWebviewPanelFromCache(this.panelGroupKey, this.panelName);
  }
}
