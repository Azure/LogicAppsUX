/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWorkflowNode } from '../../../utils/workspace';
import { Uri } from 'vscode';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../../localize';

export async function generateTests(context: IActionContext, node: Uri | undefined): Promise<void> {
  const workflowNode = getWorkflowNode(node);
  if (!(workflowNode instanceof Uri)) {
    const errorMessage = 'The workflow node is undefined. A valid workflow node is required to generate tests.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage;
    throw new Error(localize('workflowNodeUndefined', errorMessage));
  }

  // TODO(aeldridge): Implement
}
