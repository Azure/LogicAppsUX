/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import OpenDesignerForLocalProject from './openDesignerForLocalProject';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { Uri } from 'vscode';

export async function openDesigner(context: IActionContext, node: Uri | undefined): Promise<void> {
  let openDesignerObj: OpenDesignerForLocalProject | undefined;

  if (node instanceof Uri) {
    openDesignerObj = new OpenDesignerForLocalProject(context, node);
  }

  await openDesignerObj?.createPanel();
}
