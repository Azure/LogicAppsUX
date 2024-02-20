/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { managementApiPrefix, workflowAppApiVersion } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getWorkflow } from '../../utils/codeless/apiUtils';
import { resolveSettingsInConnection } from '../../utils/codeless/connection';
import { sendAzureRequest } from '../../utils/requestUtils';
import { getThemedIconPath } from '../../utils/tree/assets';
import { getProjectContextValue } from '../../utils/tree/projectContextValues';
import type { RemoteWorkflowsTreeItem } from './RemoteWorkflowsTreeItem';
import type { StringDictionary } from '@azure/arm-appservice';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import { isEmptyString, HTTP_METHODS } from '@microsoft/logic-apps-shared';
import { AzExtTreeItem, DialogResponses } from '@microsoft/vscode-azext-utils';
import type { IActionContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import { ProjectResource } from '@microsoft/vscode-extension';
import type {
  ServiceProviderConnectionModel,
  IWorkflowFileContent,
  Artifacts,
  Parameter,
  ICallbackUrlResponse,
} from '@microsoft/vscode-extension';
import { ProgressLocation, window } from 'vscode';

export class RemoteWorkflowTreeItem extends AzExtTreeItem {
  public readonly name: string;
  public readonly parent: RemoteWorkflowsTreeItem;
  public readonly workflowFileContent: IWorkflowFileContent;
  public credentials: ServiceClientCredentials;

  private constructor(parent: RemoteWorkflowsTreeItem, name: string, workflowFileContent: IWorkflowFileContent) {
    super(parent);
    this.name = name;
    this.workflowFileContent = workflowFileContent;
  }

  public get id(): string {
    return this.name;
  }

  public get label(): string {
    return this.name;
  }

  public get contextValue(): string {
    return getProjectContextValue(this.parent.parent.source, this.parent.access, ProjectResource.Workflow);
  }

  public get iconPath(): TreeItemIconPath {
    return getThemedIconPath('Codeless');
  }

  public get logStreamLabel(): string {
    return `${this.parent.parent.site.fullName}/${this.name}`;
  }

  public get logStreamPath(): string {
    return `application/functions/function/${encodeURIComponent(this.name)}`;
  }

  public static async create(parent: RemoteWorkflowsTreeItem, workflowEnvelope: any): Promise<RemoteWorkflowTreeItem> {
    const name: string = workflowEnvelope.name;
    const workflowFileContent: IWorkflowFileContent = await getWorkflow(parent.parent, workflowEnvelope, parent._context);
    return new RemoteWorkflowTreeItem(parent, name, workflowFileContent);
  }

  public async deleteTreeItemImpl(): Promise<void> {
    const message: string = localize('ConfirmDeleteWorkflow', 'Are you sure you want to delete workflow "{0}"?', this.name);
    const deleting: string = localize('DeletingWorkflow', 'Deleting function "{0}"...', this.name);
    const deleteSucceeded: string = localize('DeleteWorkflowSucceeded', 'Successfully deleted workflow "{0}".', this.name);
    await this.parent._context.ui.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
    await window.withProgress({ location: ProgressLocation.Notification, title: deleting }, async (): Promise<void> => {
      ext.outputChannel.appendLog(deleting);
      window.showInformationMessage(deleteSucceeded);
      ext.outputChannel.appendLog(deleteSucceeded);
    });
  }

  public async getArtifacts(): Promise<Artifacts> {
    return this.parent.getArtifacts();
  }

  public async getConnectionsData(): Promise<string> {
    return this.parent.getConnectionsData();
  }

  public async getParametersData(): Promise<Record<string, Parameter>> {
    return this.parent.getParametersData();
  }

  public async getAppSettings(): Promise<Record<string, string>> {
    const client = await this.parent.parent.site.createClient(this.parent._context);
    const appSettings: StringDictionary = await client.listApplicationSettings();
    return appSettings.properties || {};
  }

  public async getWorkflowCallbackUrl(node: RemoteWorkflowTreeItem, triggerName: string): Promise<ICallbackUrlResponse | undefined> {
    const url = `${this.parent.parent.id}/hostruntime${managementApiPrefix}/workflows/${this.name}/triggers/${triggerName}/listCallbackUrl?api-version=${workflowAppApiVersion}`;

    try {
      const response = await sendAzureRequest(url, this.parent._context, HTTP_METHODS.POST, node.subscription);
      return response.parsedBody;
    } catch (error) {
      return undefined;
    }
  }

  public async getChildWorkflows(context: IActionContext): Promise<Record<string, any>> {
    return this.parent.getManualWorkflows(context, this.name);
  }

  public async getConnectionConfiguration(connectionId: string): Promise<{ connection: ServiceProviderConnectionModel } | undefined> {
    const connectionsJsonString = await this.getConnectionsData();
    const connectionsJson = isEmptyString(connectionsJsonString) ? {} : JSON.parse(connectionsJsonString);
    const settings = await this.getAppSettings();

    const connectionName = connectionId.split('/').slice(-1)[0];
    const connectionInfo = connectionsJson.serviceProviderConnections?.[connectionName];

    if (connectionInfo) {
      const resolvedConnectionInfo = resolveSettingsInConnection(connectionInfo, settings);
      delete resolvedConnectionInfo.displayName;

      return {
        connection: resolvedConnectionInfo,
      };
    }

    return undefined;
  }
}
