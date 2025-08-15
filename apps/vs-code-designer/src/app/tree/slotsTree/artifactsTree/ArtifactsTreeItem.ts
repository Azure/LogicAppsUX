/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import type { SlotTreeItem } from '../SlotTreeItem';
import type { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import { createSiteFilesUrl, FolderTreeItem } from '@microsoft/vscode-azext-azureappservice';

export class ArtifactsTreeItem extends FolderTreeItem {
  public static contextValue = 'Artifacts';
  private readonly _contextValue: string = ArtifactsTreeItem.contextValue;

  public get contextValue(): string {
    return this._contextValue;
  }

  protected readonly _isRoot: boolean = false;

  constructor(parent: SlotTreeItem, client: ParsedSite) {
    super(parent, {
      site: client,
      label: localize('Artifacts', 'Artifacts'),
      url: createSiteFilesUrl(client, 'site/wwwroot/Artifacts/'),
      isReadOnly: true,
    });
  }
}
