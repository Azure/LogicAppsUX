/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { getWorkflowNode } from '../../../utils/workspace';
import type { Uri } from 'vscode';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { OverviewPanel } from './panels/overviewPanel';
import RemoteOverviewPanel from './panels/remoteOverviewPanel';
import LocalOverviewPanel from './panels/localOverviewPanel';
import LocalCodefulOverviewPanel from './panels/localCodefulOverviewPanel';

export async function openOverview(context: IActionContext, node: Uri | RemoteWorkflowTreeItem | undefined): Promise<void> {
  const workflowNode = getWorkflowNode(node);
  if (!workflowNode) {
    ext.outputChannel.appendLog(localize('workflowNodeNotFound', 'Failed to open overview. Unable to find the workflow node.'));
    return;
  }

  const overviewPanel = getOverviewPanel(context, workflowNode);
  await overviewPanel.create();
}

function getOverviewPanel(context: IActionContext, workflowNode: Uri | RemoteWorkflowTreeItem): OverviewPanel {
  if (workflowNode instanceof RemoteWorkflowTreeItem) {
    return new RemoteOverviewPanel(context, workflowNode);
  }

  if (workflowNode.fsPath.endsWith('.cs')) {
    return new LocalCodefulOverviewPanel(context, workflowNode);
  }

  return new LocalOverviewPanel(context, workflowNode);
}
