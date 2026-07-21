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
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { shouldAlwaysBuildCustomCode } from '../../../utils/vsCodeConfig/settings';
import type { DesignerV2Panel } from './panels/designerV2Panel';
import LocalDesignerV2Panel from './panels/localDesignerV2Panel';
import { RemoteDesignerV2Panel } from './panels/remoteDesignerV2Panel';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

/**
 * Opens the V2 designer for a workflow. If `runId` is provided, the designer
 * opens in monitoring mode for that run (or switches an existing panel to it).
 */
export async function openDesignerV2(
  context: IActionContext,
  node: Uri | RemoteWorkflowTreeItem | undefined,
  runId?: string
): Promise<void> {
  const workflowNode = getWorkflowNode(node);
  if (!workflowNode) {
    ext.outputChannel.appendLog(localize('workflowNodeNotFound', 'Failed to open designer. Unable to find the workflow node.'));
    return;
  }

  const designerPanel = await getDesignerV2Panel(context, workflowNode, runId);
  await designerPanel.create();
}

async function getDesignerV2Panel(
  context: IActionContext,
  workflowNode: Uri | RemoteWorkflowTreeItem,
  runId?: string
): Promise<DesignerV2Panel> {
  if (workflowNode instanceof RemoteWorkflowTreeItem) {
    return new RemoteDesignerV2Panel(context, workflowNode, runId);
  }

  const logicAppNode = Uri.file(path.join(workflowNode.fsPath, '../../'));
  const isMonitoringView = !!runId;
  if (!isMonitoringView && (shouldAlwaysBuildCustomCode() || !(await customCodeArtifactsExist(logicAppNode.fsPath)))) {
    await tryBuildCustomCodeFunctionsProject(context, logicAppNode);
  }

  return new LocalDesignerV2Panel(context, workflowNode, runId);
}
