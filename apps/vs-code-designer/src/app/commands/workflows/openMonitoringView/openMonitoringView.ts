/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import OpenMonitoringViewForLocal from './openMonitoringViewForLocal';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { Uri } from 'vscode';

export async function openMonitoringView(
  context: IAzureConnectorsContext,
  node: Uri | RemoteWorkflowTreeItem | undefined,
  runId: string,
  workflowFilePath: string
): Promise<void> {
  let monitoringView: OpenMonitoringViewForLocal;
  let monitoringViewTelemetry = '';

  if (node instanceof Uri) {
    monitoringView = new OpenMonitoringViewForLocal(context, runId, workflowFilePath);
    monitoringViewTelemetry = 'Local';
  } else {
    monitoringViewTelemetry = 'ForAzureResource';
  }

  await callWithTelemetryAndErrorHandling(`logicAppsExtension.openMonitoringView${monitoringViewTelemetry}`, async () => {
    await monitoringView?.createPanel();
  });
}
