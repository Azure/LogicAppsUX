/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import RemoteMonitoringPanel from './panels/remoteMonitoringPanel';
import LocalMonitoringPanel from './panels/localMonitoringPanel';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { Uri, workspace } from 'vscode';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { openDesignerV2 } from '../designer-v2/openDesignerV2';
import { defaultDesignerVersion, designerVersionSetting } from '../../../../constants';

export async function openMonitoringView(
  context: IActionContext,
  node: Uri | RemoteWorkflowTreeItem | undefined,
  runId: string,
  workflowFilePath: string
): Promise<void> {
  if (!node) {
    ext.outputChannel.appendLog(localize('workflowNodeNotFound', 'Failed to open monitoring view. Unable to find the workflow node.'));
    return;
  }

  const designerVersion = workspace.getConfiguration(ext.prefix).get<number>(designerVersionSetting) ?? defaultDesignerVersion;
  if (designerVersion === 2) {
    return openDesignerV2(context, node, runId);
  }

  const monitoringPanel =
    node instanceof Uri
      ? new LocalMonitoringPanel(context, runId, workflowFilePath)
      : new RemoteMonitoringPanel(context, runId, workflowFilePath, node);

  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.openMonitoringView', async (actionContext: IActionContext) => {
    actionContext.telemetry.properties.isLocal = node instanceof Uri ? 'true' : 'false';
    await monitoringPanel.create();
  });
}
