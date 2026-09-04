/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { getParentLogicAppRoot, getActiveWorkflowNode } from '../../../utils/workspace';
import type { Uri } from 'vscode';
import { tryBuildCustomCodeFunctionsProjectInternal } from '../../buildCustomCodeFunctionsProject';
import { customCodeArtifactsExist } from '../../../utils/customCodeUtils';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { shouldAlwaysBuildCustomCode } from '../../../utils/vsCodeConfig/settings';
import type { DesignerV2Panel } from './panels/designerV2Panel';
import LocalDesignerV2Panel from './panels/localDesignerV2Panel';
import { RemoteDesignerV2Panel } from './panels/remoteDesignerV2Panel';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';

/**
 * Opens the V2 designer for a workflow. If `runId` is provided, the designer
 * opens in monitoring mode for that run (or switches an existing panel to it).
 */
export async function openDesignerV2(
  context: IActionContext,
  node: Uri | RemoteWorkflowTreeItem | undefined,
  runId?: string
): Promise<void> {
  const workflowNode = node ?? getActiveWorkflowNode();
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

  const projectPath = await getParentLogicAppRoot(workflowNode.fsPath);
  if (!projectPath) {
    throw new Error(localize('LogicAppRootError', 'Unable to determine logic app project root.'));
  }

  const isMonitoringView = !!runId;
  if (!isMonitoringView && (shouldAlwaysBuildCustomCode() || !(await customCodeArtifactsExist(projectPath)))) {
    await callWithTelemetryAndErrorHandling('openDesignerV2.buildCustomCodeFunctionsProject', async (actionContext: IActionContext) => {
      actionContext.errorHandling.rethrow = true;
      actionContext.errorHandling.suppressDisplay = true;
      await tryBuildCustomCodeFunctionsProjectInternal(actionContext, projectPath);
    });
  }

  return new LocalDesignerV2Panel(context, workflowNode, runId);
}
