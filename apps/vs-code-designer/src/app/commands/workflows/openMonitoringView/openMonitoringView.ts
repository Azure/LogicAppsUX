/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import openMonitoringViewForAzureResource from './openMonitoringViewForAzureResource';
import OpenMonitoringViewForLocal from './openMonitoringViewForLocal';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { Uri } from 'vscode';

export async function openMonitoringView(
  context: IActionContext | IAzureConnectorsContext,
  node: Uri | RemoteWorkflowTreeItem | undefined,
  runId: string,
  workflowFilePath: string
): Promise<void> {
  let monitoringView: OpenMonitoringViewForLocal | openMonitoringViewForAzureResource;
  let monitoringViewTelemetry = '';

  if (node instanceof Uri) {
    monitoringView = new OpenMonitoringViewForLocal(context, runId, workflowFilePath);
    monitoringViewTelemetry = 'Local';
  } else {
    monitoringView = new openMonitoringViewForAzureResource(context, runId, workflowFilePath, node as RemoteWorkflowTreeItem);
    monitoringViewTelemetry = 'ForAzureResource';
  }

  await callWithTelemetryAndErrorHandling(`logicAppsExtension.openMonitoringView${monitoringViewTelemetry}`, async () => {
    await monitoringView?.createPanel();
  });
}
