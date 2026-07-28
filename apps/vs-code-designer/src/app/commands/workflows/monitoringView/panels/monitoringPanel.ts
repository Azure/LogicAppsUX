/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../../extensionVariables';
import { tryGetWebviewPanel } from '../../../../utils/codeless/common';
import { DesignerPanel } from '../../designer/panels/designerPanel';
import { openReadOnlyJson } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { WebviewPanel } from 'vscode';
import * as vscode from 'vscode';

export abstract class MonitoringPanel extends DesignerPanel {
  protected workflowFilePath: string;

  protected constructor(context: IActionContext, runId: string, workflowFilePath: string, isLocal: boolean, apiVersion: string) {
    const runName = runId ? runId.split('/').slice(-1)[0] : '';
    const workflowName = runId.split('/').slice(-3)[0];
    const panelNamePrefix = isLocal ? `${vscode.workspace.name}-` : '';
    const panelName = `${panelNamePrefix}${workflowName}-${runName}`;
    const panelGroupKey = ext.webViewKey.monitoring;

    super(context, workflowName, panelName, apiVersion, panelGroupKey, true, isLocal, true, runName);

    this.workflowFilePath = workflowFilePath;
  }

  protected async openContent(header: number, id: string, title: string, content: string): Promise<void> {
    const headerText = header === 0 ? 'Inputs' : 'Outputs';
    return openReadOnlyJson({ label: `${headerText}-${title}`, fullId: id }, JSON.parse(content));
  }

  protected getExistingPanel(): WebviewPanel | undefined {
    return tryGetWebviewPanel(this.panelGroupKey, this.panelName);
  }
}
