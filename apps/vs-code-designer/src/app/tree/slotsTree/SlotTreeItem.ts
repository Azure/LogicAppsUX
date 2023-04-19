/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { LogicAppResourceTree } from '../LogicAppResourceTree';
import type { RemoteWorkflowTreeItem } from '../remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { SlotTreeItemBase } from './SlotTreeItemBase';
import type { AzExtParentTreeItem } from '@microsoft/vscode-azext-utils';

export class SlotTreeItem extends SlotTreeItemBase {
  public static contextValue = 'azLogicAppsSlot';
  public readonly contextValue: string = SlotTreeItem.contextValue;
  public readonly parent: AzExtParentTreeItem;

  public constructor(parent: AzExtParentTreeItem, resourceTree: LogicAppResourceTree) {
    super(parent, resourceTree);
  }

  public get label(): string {
    return this.site.slotName;
  }
}

export function isSlotTreeItem(treeItem: SlotTreeItem | RemoteWorkflowTreeItem | AzExtParentTreeItem): treeItem is SlotTreeItem {
  return !!(treeItem as SlotTreeItem).site;
}
