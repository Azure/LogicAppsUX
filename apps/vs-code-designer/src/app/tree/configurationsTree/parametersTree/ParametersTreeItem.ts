/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { getParameters } from '../../../utils/codeless/apiUtils';
import { getThemedIconPath } from '../../../utils/tree/assets';
import { getProjectContextValue } from '../../../utils/tree/projectContextValues';
import type { ConfigurationsTreeItem } from '../../configurationsTree/ConfigurationsTreeItem';
import { ParameterTreeItem } from './ParameterTreeItem';
import type { AzExtTreeItem, ILoadingTreeContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import { AzExtParentTreeItem } from '@microsoft/vscode-azext-utils';
import { ProjectAccess, ProjectResource } from '@microsoft/vscode-extension-logic-apps';

export class ParametersTreeItem extends AzExtParentTreeItem {
  public readonly label: string = localize('Parameters', 'Parameters');
  public readonly childTypeLabel: string = localize('Parameter', 'Parameter');
  public readonly parent: ConfigurationsTreeItem;
  public isReadOnly: boolean;

  private constructor(parent: ConfigurationsTreeItem) {
    super(parent);
  }

  public static async createParametersTreeItem(parent: ConfigurationsTreeItem): Promise<ParametersTreeItem> {
    const treeItem: ParametersTreeItem = new ParametersTreeItem(parent);
    await treeItem.refreshImpl();
    return treeItem;
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
      'azLogicAppInvalidParameter',
      async (parameter) => await ParameterTreeItem.create(this, parameter),
      (parameter) => parameter.name
    );
  }
}
