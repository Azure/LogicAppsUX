/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DesignerPanel } from '../../designer/panels/designerPanel';
import { openReadOnlyJson } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

export abstract class DesignerV2Panel extends DesignerPanel {
  protected constructor(
    context: IActionContext,
    workflowName: string,
    panelName: string,
    apiVersion: string,
    panelGroupKey: string,
    isLocal: boolean,
    runId?: string
  ) {
    const runName = runId ? runId.split('/').slice(-1)[0] : '';
    const isMonitoring = !!runId;

    super(context, workflowName, panelName, apiVersion, panelGroupKey, false, isLocal, isMonitoring, runName);
  }

  /**
   * Sends a selectRun message to the webview to switch the designer
   * to monitoring mode for the given run.
   */
  public selectRun(runId: string): void {
    const runName = runId.split('/').slice(-1)[0];
    this.panel?.webview.postMessage({
      command: ExtensionCommand.selectRun,
      runId: runName,
    });
  }

  /**
   * Opens run inputs/outputs in a read-only JSON editor tab.
   */
  protected async openContent(header: number, id: string, title: string, content: string): Promise<void> {
    const headerText = header === 0 ? 'Inputs' : 'Outputs';
    return openReadOnlyJson({ label: `${headerText}-${title}`, fullId: id }, JSON.parse(content));
  }
}
