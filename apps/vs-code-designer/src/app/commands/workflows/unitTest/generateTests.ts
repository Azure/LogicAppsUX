/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWorkflowNode } from '../../../utils/workspace';
import { Uri } from 'vscode';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../../localize';
import * as fse from 'fs-extra';
import { FlowGraph } from '../../../utils/flowgraph';
import { ext } from '../../../../extensionVariables';

export async function generateTests(context: IActionContext, node: Uri | undefined): Promise<void> {
  const workflowNode = getWorkflowNode(node);
  if (!(workflowNode instanceof Uri)) {
    const errorMessage = 'The workflow node is undefined. A valid workflow node is required to generate tests.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage;
    throw new Error(localize('workflowNodeUndefined', errorMessage));
  }

  const workflowPath = workflowNode.fsPath;
  const workflowContent = JSON.parse(await fse.readFile(workflowPath, 'utf8')) as Record<string, any>;
  const workflowDefinition = workflowContent.definition as Record<string, any>;
  const workflowGraph = new FlowGraph(workflowDefinition);
  const paths = workflowGraph.getAllExecutionPaths();
  ext.outputChannel.appendLog(
    localize('generateTestsPaths', 'Generated {0} execution paths for workflow: {1}', paths.length, workflowPath)
  );

  // TODO(aeldridge): Implement
}
