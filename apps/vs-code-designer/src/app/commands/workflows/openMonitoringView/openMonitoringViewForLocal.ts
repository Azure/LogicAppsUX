/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName, managementApiPrefix } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import { removeWebviewPanelFromCache, cacheWebviewPanel, getTriggerName } from '../../../utils/codeless/common';
import { getConnectionsFromFile, getFunctionProjectRoot, getParametersFromFile } from '../../../utils/codeless/connection';
import { sendRequest } from '../../../utils/requestUtils';
import { OpenMonitoringViewBase } from './openMonitoringViewBase';
import { HTTP_METHODS } from '@microsoft/utils-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import { promises } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { WebviewPanel } from 'vscode';
import { ViewColumn } from 'vscode';

const apiVersion = '2019-10-01-edge-preview';

export default class OpenMonitoringViewForLocal extends OpenMonitoringViewBase {
  private projectPath: string | undefined;

  constructor(context: IActionContext, runId: string, workflowFilePath: string) {
    super(context, runId, workflowFilePath);
  }

  public async createPanel(): Promise<void> {
    const existingPanel: WebviewPanel | undefined = this.getExistingPanel();

    if (existingPanel) {
      this.panel = existingPanel;
      if (!existingPanel.active) {
        existingPanel.reveal(vscode.ViewColumn.Active);
      }

      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      this.panelGroupKey, // Key used to reference the panel
      this.panelName, // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in.
      this.getPanelOptions()
    );
    /*eslint-disable @typescript-eslint/no-unused-vars */

    this.projectPath = await getFunctionProjectRoot(this.context, this.workflowFilePath);
    const connectionsData = await getConnectionsFromFile(this.context, this.workflowFilePath);
    const parametersData = await getParametersFromFile(this.context, this.workflowFilePath);
    this.baseUrl = `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}`;

    let localSettings: Record<string, string>;

    if (this.projectPath) {
      localSettings = (await getLocalSettingsJson(this.context, path.join(this.projectPath, localSettingsFileName))).Values;
    } else {
      throw new Error(localize('FunctionRootFolderError', 'Unable to determine function project root folder.'));
    }

    /*eslint-enable */

    this.panel.webview.onDidReceiveMessage(
      async (message) => await this._handleWebviewMsg(message),
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

  private async _handleWebviewMsg(message: any) {
    switch (message.command) {
      case ExtensionCommand.showContent: {
        await this.openContent(message.header, message.id, message.title, message.content);
        break;
      }
      case ExtensionCommand.resubmitRun: {
        await this.resubmitRun();
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
        const triggerName = getTriggerName(workflowContent.definition);
        const url = `${this.baseUrl}/workflows/${this.workflowName}/triggers/${triggerName}/histories/${this.runName}/resubmit?api-version=${apiVersion}`;

        await sendRequest(this.context, { url, method: HTTP_METHODS.POST });
      } catch (error) {
        const errorMessage = localize('runResubmitFailed', 'Workflow run resubmit failed: ') + error.message;
        await vscode.window.showErrorMessage(errorMessage, localize('OK', 'OK'));
      }
    });
  }
}
