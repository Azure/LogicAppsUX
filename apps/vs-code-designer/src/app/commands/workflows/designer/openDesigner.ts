/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { getWorkflowNode } from '../../../utils/workspace';
import { Uri } from 'vscode';
import { tryBuildCustomCodeFunctionsProject } from '../../buildCustomCodeFunctionsProject';
import { customCodeArtifactsExist } from '../../../utils/customCodeUtils';
import type { DesignerPanel } from './panels/designerPanel';
import { RemoteDesignerPanel } from './panels/remoteDesignerPanel';
import LocalDesignerPanel from './panels/localDesignerPanel';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function openDesigner(context: IActionContext, node: Uri | RemoteWorkflowTreeItem | undefined): Promise<void> {
  const workflowNode = getWorkflowNode(node);
  if (!workflowNode) {
    ext.outputChannel.appendLog(localize('workflowNodeNotFound', 'Failed to open designer. Unable to find the workflow node.'));
    return;
  }

  const designerPanel = await getDesignerPanel(context, workflowNode);
  await designerPanel.create();
}

async function getDesignerPanel(context: IActionContext, workflowNode: Uri | RemoteWorkflowTreeItem): Promise<DesignerPanel> {
  if (workflowNode instanceof RemoteWorkflowTreeItem) {
    return new RemoteDesignerPanel(context, workflowNode);
  }

  const logicAppNode = Uri.file(path.join(workflowNode.fsPath, '../../'));
  if (!(await customCodeArtifactsExist(logicAppNode.fsPath))) {
    await tryBuildCustomCodeFunctionsProject(context, logicAppNode);
  }

  return new LocalDesignerPanel(context, workflowNode);
}
