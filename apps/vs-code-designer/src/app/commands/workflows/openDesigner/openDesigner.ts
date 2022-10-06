/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import OpenDesignerForLocalProject from './openDesignerForLocalProject';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { Uri } from 'vscode';

export async function openDesigner(context: IActionContext, node: Uri | undefined): Promise<void> {
  const logicAppNode = node[0];

  let openDesignerObj: OpenDesignerForLocalProject | undefined;

  if (logicAppNode instanceof Uri) {
    openDesignerObj = new OpenDesignerForLocalProject(context, logicAppNode);
  }

  // tslint:disable-next-line: no-unnecessary-type-assertion
  await openDesignerObj?.createPanel();
}
