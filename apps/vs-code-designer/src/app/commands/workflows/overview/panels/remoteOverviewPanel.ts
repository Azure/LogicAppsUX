/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getTriggerName } from '@microsoft/logic-apps-shared';
import { workflowAppApiVersion } from '../../../../../constants';
import { localize } from '../../../../../localize';
import type { RemoteWorkflowTreeItem } from '../../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { getWorkflowManagementBaseURI } from '../../../../utils/codeless/common';
import { getAuthorizationTokenFromNode } from '../../../../utils/codeless/getAuthorizationToken';
import { getWorkflowProperties, normalizeLocation } from '../utils/overviewHelpers';
import { OverviewPanel } from './overviewPanel';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';
import type * as vscode from 'vscode';

export default class RemoteOverviewPanel extends OverviewPanel {
  private readonly node: RemoteWorkflowTreeItem;

  constructor(context: IActionContext, node: RemoteWorkflowTreeItem) {
    const workflowName = node.name;
    const panelName = `${node.id}-${workflowName}-overview`;
    const panelTitle = `${workflowName}-overview`;

    super(context, workflowName, panelName, panelTitle, workflowAppApiVersion, false);

    this.node = node;
    this.corsNotice = localize('CorsNotice', 'To view runs, set "*" to allowed origins in the CORS setting.');
  }

  protected async isEnvironmentReady(): Promise<boolean> {
    return true;
  }

  protected async initializeOverviewData(): Promise<void> {
    this.workflowContent = this.node.workflowFileContent;
    this.triggerName = getTriggerName(this.workflowContent.definition);
    this.baseUrl = this.getBaseUrl();
    this.accessToken = await this.getAccessToken();
    this.callbackInfo = this.baseUrl ? await this.getCallbackInfo(this.baseUrl) : undefined;
    this.azureDetails = {
      enabled: true,
      accessToken: this.accessToken,
      subscriptionId: this.node?.subscription?.subscriptionId,
      location: normalizeLocation(this.node?.parent?.parent?.site.location),
      workflowManagementBaseUrl: this.node?.parent?.subscription?.environment?.resourceManagerEndpointUrl,
      tenantId: this.node?.parent?.subscription?.tenantId,
      resourceGroupName: this.node?.parent?.parent?.site.resourceGroup,
    };
    this.workflowProps = getWorkflowProperties(this.workflowName, this.workflowContent, {}, this.callbackInfo, this.triggerName);
  }

  protected getBaseUrl(): string | undefined {
    return getWorkflowManagementBaseURI(this.node);
  }

  protected async getCallbackInfo(baseUrl: string): Promise<ICallbackUrlResponse | undefined> {
    return await this.node.getCallbackUrl(this.node, baseUrl, this.triggerName, this.apiVersion);
  }

  protected async getAccessToken(): Promise<string> {
    return await getAuthorizationTokenFromNode(this.node);
  }

  protected getWorkflowNode(): vscode.Uri | RemoteWorkflowTreeItem {
    return this.node;
  }
}
