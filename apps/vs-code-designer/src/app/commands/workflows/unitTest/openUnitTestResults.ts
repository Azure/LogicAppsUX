/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { developmentDirectoryName, testsDirectoryName, workflowFileName } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { getUnitTestName, pickUnitTest } from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkflowNode, getWorkspaceFolder } from '../../../utils/workspace';
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import OpenDesignerForLocalProject from '../openDesigner/openDesignerForLocalProject';
import { readFileSync } from 'fs';
import * as path from 'path';
import { type TestItem, Uri, window } from 'vscode';

export async function openUnitTestResults(context: IAzureConnectorsContext, node: Uri | TestItem): Promise<void> {
  let unitTestNode: Uri;
  const workspaceFolder = await getWorkspaceFolder(context);
  const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

  if (node && node instanceof Uri) {
    unitTestNode = getWorkflowNode(node) as Uri;
  } else if (node && !(node instanceof Uri) && node.uri instanceof Uri) {
    unitTestNode = node.uri;
  } else {
    const unitTest = await pickUnitTest(context, path.join(projectPath, developmentDirectoryName, testsDirectoryName));
    unitTestNode = Uri.file(unitTest.data) as Uri;
  }
  const unitTestName = getUnitTestName(unitTestNode.fsPath);

  if (ext.testRuns.has(unitTestNode.fsPath)) {
    const workflowName = path.basename(path.dirname(unitTestNode.fsPath));
    const workflowPath = path.join(projectPath, workflowName, workflowFileName);
    const workflowNode = Uri.file(workflowPath);
    const unitTestDefinition = JSON.parse(readFileSync(unitTestNode.fsPath, 'utf8'));

    const openDesignerObj = new OpenDesignerForLocalProject(context, workflowNode, unitTestName, unitTestDefinition);
    await openDesignerObj?.createPanel();
  }

  window.showInformationMessage(
    localize('noRunForUnitTest', 'There is no run for the selected unit test. Make sure to run the unit test for "{0}"', unitTestName)
  );
}
