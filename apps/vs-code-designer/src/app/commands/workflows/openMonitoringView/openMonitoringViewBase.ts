/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { tryGetWebviewPanel } from '../../../utils/codeless/common';
import { openReadOnlyJson } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { WebviewPanel } from 'vscode';
import * as vscode from 'vscode';

export abstract class OpenMonitoringViewBase {
  protected panel: WebviewPanel;
  protected panelName: string;
  protected panelGroupKey: ext.webViewKey;
  protected runId: string;
  protected baseUrl: string;
  protected runName: string;
  protected workflowName: string;
  protected workflowFilePath: string;
  protected readonly context: IActionContext;

  protected constructor(context: IActionContext, runId: string, workflowFilePath: string) {
    this.context = context;
    this.runId = runId.endsWith('/') ? runId.substring(0, runId.length - 1) : runId;
    this.runName = runId.split('/').slice(-1)[0];
    this.workflowName = runId.split('/').slice(-3)[0];
    this.workflowFilePath = workflowFilePath;
    this.panelName = `${vscode.workspace.name}-${this.workflowName}-${this.runName}`;
    this.panelGroupKey = ext.webViewKey.monitoring;
  }

  protected async openContent(header: number, id: string, title: string, content: string): Promise<void> {
    const headerText = header === 0 ? 'Inputs' : 'Outputs';
    return openReadOnlyJson({ label: `${headerText}-${title}`, fullId: id }, JSON.parse(content));
  }

  protected getExistingPanel(): WebviewPanel | undefined {
    return tryGetWebviewPanel(this.panelGroupKey, this.panelName);
  }

  protected getPanelOptions(): vscode.WebviewOptions & vscode.WebviewPanelOptions {
    return {
      enableScripts: true,
      retainContextWhenHidden: true,
    };
  }
}
