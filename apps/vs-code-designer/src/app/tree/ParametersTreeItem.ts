/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import { getParameters } from '../utils/codeless/apiUtils';
import { getThemedIconPath } from '../utils/tree/resources';
import type { ConfigurationsTreeItem } from './ConfigurationsTreeItem';
import { ParameterTreeItem } from './ParameterTreeItem';
import { getProjectContextValue } from './projectContextValues';
import { ProjectAccess, ProjectResource } from '@microsoft-logic-apps/utils';
import type { AzExtTreeItem, ILoadingTreeContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import { AzExtParentTreeItem } from '@microsoft/vscode-azext-utils';

export class ParametersTreeItem extends AzExtParentTreeItem {
  public readonly label: string = localize('Parameters', 'Parameters');
  public readonly childTypeLabel: string = localize('Parameter', 'Parameter');
  public readonly parent: ConfigurationsTreeItem;
  public isReadOnly: boolean;

  private constructor(parent: ConfigurationsTreeItem) {
    super(parent);
  }

  public static async createParametersTreeItem(parent: ConfigurationsTreeItem): Promise<ParametersTreeItem> {
    const ti: ParametersTreeItem = new ParametersTreeItem(parent);
    // initialize
    await ti.refreshImpl();
    return ti;
  }

  public async refreshImpl(): Promise<void> {
    this.isReadOnly = this.parent.isReadOnly;
  }

  public hasMoreChildrenImpl(): boolean {
    return false;
  }

  public get description(): string {
    return localize('readOnly', 'Read-only');
  }

  public get access(): ProjectAccess {
    return this.isReadOnly ? ProjectAccess.ReadOnly : ProjectAccess.ReadWrite;
  }

  public get id(): string {
    return 'parameters';
  }

  public get iconPath(): TreeItemIconPath {
    return getThemedIconPath('list-unordered');
  }

  public get contextValue(): string {
    return getProjectContextValue(this.parent.parent.source, this.access, ProjectResource.Parameters);
  }

  public async loadMoreChildrenImpl(_clearCache: boolean, context: ILoadingTreeContext): Promise<AzExtTreeItem[]> {
    const parameters = await getParameters(context, this.parent.parent);

    return await this.createTreeItemsWithErrorHandling(
      parameters,
      'azFuncInvalidParameter',
      async (parameter) => await ParameterTreeItem.create(this, parameter),
      (parameter) => parameter.name
    );
  }
}
