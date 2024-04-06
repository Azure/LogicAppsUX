/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ConnectionTreeItem } from '../../tree/configurationsTree/connectionsTree/ConnectionTreeItem';
import { ParameterTreeItem } from '../../tree/configurationsTree/parametersTree/ParameterTreeItem';
import { RemoteWorkflowTreeItem } from '../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { openReadOnlyJson } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type {
  Parameter,
  ConnectionReferenceModel,
  FunctionConnectionModel,
  ServiceProviderConnectionModel,
  IWorkflowFileContent,
} from '@microsoft/vscode-extension-logic-apps';

export async function viewContent(_context: IActionContext, node: ConnectionTreeItem | RemoteWorkflowTreeItem): Promise<void> {
  let data:
    | Record<string, Parameter | ConnectionReferenceModel | FunctionConnectionModel | ServiceProviderConnectionModel>
    | IWorkflowFileContent = {};

  if (node instanceof ConnectionTreeItem || node instanceof ParameterTreeItem) {
    data = {
      [node.name]: node.content,
    };
  } else if (node instanceof RemoteWorkflowTreeItem) {
    data = node.workflowFileContent;
  }

  await openReadOnlyJson(node, data);
}
