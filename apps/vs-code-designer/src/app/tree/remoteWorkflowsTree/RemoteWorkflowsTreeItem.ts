/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { connectionsFileName, parametersFileName } from '../../../constants';
import { localize } from '../../../localize';
import { getAllArtifacts, getOptionalFileContent, listWorkflows } from '../../utils/codeless/apiUtils';
import { getRequestTriggerSchema } from '../../utils/codeless/common';
import { getThemedIconPath } from '../../utils/tree/assets';
import { getProjectContextValue } from '../../utils/tree/projectContextValues';
import type { SlotTreeItem } from '../slotsTree/SlotTreeItem';
import { RemoteWorkflowTreeItem } from './RemoteWorkflowTreeItem';
import { isNullOrEmpty } from '@microsoft/logic-apps-shared';
import { AzExtParentTreeItem } from '@microsoft/vscode-azext-utils';
import type { AzExtTreeItem, IActionContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import { ProjectAccess, ProjectResource } from '@microsoft/vscode-extension-logic-apps';
import type { Artifacts, Parameter } from '@microsoft/vscode-extension-logic-apps';

export class RemoteWorkflowsTreeItem extends AzExtParentTreeItem {
  public readonly label: string = localize('Workflows', 'Workflows');
  public readonly childTypeLabel: string = localize('Workflow', 'Workflow');
  public declare readonly parent: SlotTreeItem;
  public isReadOnly: boolean;

  private _artifacts: Artifacts;
  private _connectionsData: string;
  private _parametersData: Record<string, Parameter>;
  private _nextLink: string | undefined;
  public readonly _context: IActionContext;

  private constructor(context: IActionContext, parent: SlotTreeItem) {
    super(parent);
    this._context = context;
  }

  public static async createWorkflowsTreeItem(context: IActionContext, parent: SlotTreeItem): Promise<RemoteWorkflowsTreeItem> {
    const ti: RemoteWorkflowsTreeItem = new RemoteWorkflowsTreeItem(context, parent);
    // initialize
    await ti.refreshImpl();
    return ti;
  }

  public async refreshImpl(): Promise<void> {
    this.isReadOnly = await this.parent.isReadOnly(this._context);
  }

  public hasMoreChildrenImpl(): boolean {
    return this._nextLink !== undefined;
  }

  public get description(): string {
    return this.isReadOnly ? localize('readOnly', 'Read-only') : '';
  }

  public get access(): ProjectAccess {
    return this.isReadOnly ? ProjectAccess.ReadOnly : ProjectAccess.ReadWrite;
  }

  public get id(): string {
    return 'workflows';
  }

  public get iconPath(): TreeItemIconPath {
    return getThemedIconPath('list-unordered');
  }

  public get contextValue(): string {
    return getProjectContextValue(this.parent.source, this.access, ProjectResource.Workflows);
  }

  public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
    if (clearCache) {
      this._nextLink = undefined;
    }
    const workflows: Record<string, any>[] = await listWorkflows(this.parent, this._context);

    // https://github.com/Azure/azure-functions-host/issues/3502
    if (!Array.isArray(workflows)) {
      throw new Error(localize('failedToList', 'Failed to list workflows.'));
    }

    return await this.createTreeItemsWithErrorHandling(
      workflows,
      'azLogicAppsInvalidWorkflow',
      async (workflow: any) => await RemoteWorkflowTreeItem.create(this, workflow),
      (workflow: any) => {
        return workflow.name;
      }
    );
  }

  public async getArtifacts(): Promise<Artifacts> {
    if (!this._artifacts) {
      this._artifacts = await getAllArtifacts(this._context, this.parent);
    }

    return this._artifacts;
  }

  public async getConnectionsData(): Promise<string> {
    if (!this._connectionsData) {
      this._connectionsData = await getOptionalFileContent(this._context, this.parent, connectionsFileName);
    }

    return this._connectionsData;
  }

  public async getParametersData(): Promise<Record<string, Parameter>> {
    if (!this._parametersData || isNullOrEmpty(this._parametersData)) {
      const parametersJson: string = await getOptionalFileContent(this._context, this.parent, parametersFileName);
      this._parametersData = parametersJson ? JSON.parse(parametersJson) : {};
    }

    return this._parametersData;
  }

  public async getManualWorkflows(context: IActionContext, workflowToExclude: string): Promise<Record<string, any>> {
    const workflows = await this.getCachedChildren(context);
    const workflowDetails: Record<string, any> = {};

    for (const workflow of workflows as RemoteWorkflowTreeItem[]) {
      const { name, workflowFileContent } = workflow;
      if (name !== workflowToExclude) {
        const schema = getRequestTriggerSchema(workflowFileContent);

        if (schema) {
          workflowDetails[name] = schema;
        }
      }
    }

    return workflowDetails;
  }
}
