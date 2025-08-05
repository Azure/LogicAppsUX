/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureDirectoryInWorkspace, getWorkflowNode, getWorkspacePath } from '../../../utils/workspace';
import { Uri } from 'vscode';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../../localize';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { FlowGraph, type ParentPathNode, type PathNode } from '../../../utils/flowgraph';
import { ext } from '../../../../extensionVariables';
import {
  createTestExecutorFile,
  createTestSettingsConfigFile,
  ensureCsproj,
  getOperationMockClassContent,
  getUnitTestPaths,
  preprocessOutputParameters,
  updateCsprojFile,
  updateTestsSln,
  validateWorkflowPath,
} from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { assetsFolderName, unitTestTemplatesFolderName } from '../../../../constants';
import { syncCloudSettings } from '../../syncCloudSettings';

/**
 * Generates unit tests for a Logic App workflow based on its execution paths.
 * @param {IActionContext} context - The action context.
 * @param {Uri | undefined} node - The URI of the workflow node, if available.
 * @param {any} operationData - The original operation data with operationInfo and outputParameters.
 * @returns {Promise<void>} - A Promise that resolves when the unit tests are generated.
 */
export async function generateTests(context: IActionContext, node: Uri | undefined, operationData: any): Promise<void> {
  context.telemetry.properties.lastStep = 'getWorkflowNode';
  const workflowNode = getWorkflowNode(node);
  if (!(workflowNode instanceof Uri)) {
    const errorMessage = 'The workflow node is undefined. A valid workflow node is required to generate tests.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage;
    throw new Error(localize('workflowNodeUndefined', errorMessage));
  }

  context.telemetry.properties.lastStep = 'readWorkflowDefinition';
  const workflowPath = workflowNode.fsPath;
  const workflowContent = JSON.parse(await fse.readFile(workflowPath, 'utf8')) as Record<string, any>;
  const workflowDefinition = workflowContent.definition as Record<string, any>;
  context.telemetry.properties.lastStep = 'createFlowGraph';
  const workflowGraph = new FlowGraph(workflowDefinition);
  context.telemetry.properties.lastStep = 'getAllExecutionPaths';
  const paths = workflowGraph.getAllExecutionPaths();
  ext.outputChannel.appendLog(
    localize('generateTestsPaths', 'Generated {0} execution paths for workflow: {1}', paths.length, workflowPath)
  );

  context.telemetry.properties.lastStep = 'preprocessOutputParameters';
  const { operationInfo, outputParameters } = await preprocessOutputParameters(operationData);
  context.telemetry.properties.lastStep = 'getWorkspacePath';
  const workspaceFolder = getWorkspacePath(workflowNode.fsPath);
  context.telemetry.properties.lastStep = 'tryGetLogicAppProjectRoot';
  const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
  context.telemetry.properties.lastStep = 'validateWorkflowPath';
  validateWorkflowPath(projectPath, workflowNode.fsPath);
  const workflowName = path.basename(path.dirname(workflowNode.fsPath));
  context.telemetry.properties.lastStep = 'getUnitTestPaths';
  const { testsDirectory, logicAppName, logicAppTestFolderPath, workflowTestFolderPath, mocksFolderPath } = getUnitTestPaths(
    projectPath,
    workflowName
  );
  context.telemetry.properties.lastStep = 'getOperationMockClassContent';
  const { mockClassContent, foundActionMocks, foundTriggerMocks } = await getOperationMockClassContent(
    operationInfo,
    outputParameters,
    workflowNode.fsPath,
    workflowName,
    logicAppName
  );

  const workflowNameCleaned = workflowName.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const logicAppNameCleaned = logicAppName.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

  context.telemetry.properties.lastStep = 'getTestCaseMethods';
  const testCaseMethods: string[] = [];
  const testCaseData: string[] = [];
  for (const [index, scenario] of paths.entries()) {
    const triggerNode = scenario.path[0];
    const triggerMockOutputClassName = foundTriggerMocks[triggerNode.name];
    const triggerMockClassName = triggerMockOutputClassName?.replace(/(.*)Output$/, '$1Mock');
    if (!triggerMockOutputClassName) {
      throw new Error(localize('generateTestsNoTriggerMock', 'No mock found for trigger: {0}', triggerNode.name));
    }

    const pathActions = scenario.path.slice(1);
    const actionChain = getExecutedActionChain(pathActions);
    const actionChainMockable = getMockableExecutedActions(actionChain, foundActionMocks);
    const actionAssertions = (await Promise.all(pathActions.map((actionNode) => getActionAssertion(actionNode)))).flat();
    const pathName = getPathName(index, scenario.overallStatus);
    const pathDescription = getPathDescription(actionChain);

    const testCaseMethodTemplateFileName = 'TestCaseMethod';
    const testCaseMethodTemplatePath = path.join(__dirname, assetsFolderName, unitTestTemplatesFolderName, testCaseMethodTemplateFileName);
    const testCaseMethodTemplate = await fse.readFile(testCaseMethodTemplatePath, 'utf-8');
    testCaseMethods.push(
      testCaseMethodTemplate
        .replace(/<%= WorkflowName %>/g, workflowName)
        .replace(/<%= WorkflowNameCleaned %>/g, workflowNameCleaned)
        .replace(/<%= PathDescriptionString %>/g, pathDescription)
        .replace(/<%= PathName %>/g, pathName)
        .replace(/<%= ActionAssertionsContent %>/g, actionAssertions.join('\n\n'))
        .replace(/<%= PathOverallStatus %>/g, toTestWorkflowStatus(scenario.overallStatus))
    );

    testCaseData.push(`        /// <summary>
        /// Test data for the workflow path: ${pathDescription}
        /// </summary>
        public static IEnumerable<object[]> ${pathName}_TestData
        {
            get
            {
                yield return new object[]
                {
                    new ${triggerMockClassName}(outputs: new ${triggerMockOutputClassName}()),
                    new Dictionary<string, ActionMock>()
                    {
                        ${actionChainMockable.map((actionNode) => getTestDataActionMockEntry(actionNode, foundActionMocks)).join(`,\n${' '.repeat(24)}`)}
                    }
                };
            }
        }`);
  }

  context.telemetry.properties.lastStep = 'ensureTestFolders';
  await Promise.all([fse.ensureDir(logicAppTestFolderPath), fse.ensureDir(workflowTestFolderPath), fse.ensureDir(mocksFolderPath)]);

  context.telemetry.properties.lastStep = 'createTestSettingsConfigFile';
  await createTestSettingsConfigFile(workflowTestFolderPath, workflowName, logicAppName);
  context.telemetry.properties.lastStep = 'createTestExecutorFile';
  await createTestExecutorFile(logicAppTestFolderPath, logicAppNameCleaned);

  context.telemetry.properties.lastStep = 'createMockClasses';
  for (const [mockClassName, classContent] of Object.entries(mockClassContent)) {
    const mockFilePath = path.join(mocksFolderPath, `${mockClassName}.cs`);
    await fse.writeFile(mockFilePath, classContent, 'utf-8');
  }

  context.telemetry.properties.lastStep = 'writeTestClassFile';
  const testClassTemplateFileName = 'GenericTestClass';
  const testClassTemplatePath = path.join(__dirname, assetsFolderName, unitTestTemplatesFolderName, testClassTemplateFileName);
  const testClassTemplate = await fse.readFile(testClassTemplatePath, 'utf-8');
  const testClassContent = testClassTemplate
    .replace(/<%= WorkflowName %>/g, workflowName)
    .replace(/<%= LogicAppNameCleaned %>/g, logicAppNameCleaned)
    .replace(/<%= WorkflowNameCleaned %>/g, workflowNameCleaned)
    .replace(/<%= TestCaseData %>/g, testCaseData.join('\n\n'))
    .replace(/<%= TestCaseMethods %>/g, testCaseMethods.join('\n\n'));
  const csFilePath = path.join(workflowTestFolderPath, `${workflowNameCleaned}Tests.cs`);
  await fse.writeFile(csFilePath, testClassContent);

  context.telemetry.properties.lastStep = 'ensureCsproj';
  await ensureCsproj(testsDirectory, logicAppTestFolderPath, logicAppName);
  context.telemetry.properties.lastStep = 'updateCsprojFile';
  const csprojFilePath = path.join(logicAppTestFolderPath, `${logicAppName}.csproj`);
  await updateCsprojFile(csprojFilePath, workflowName);

  context.telemetry.properties.lastStep = 'ensureTestsDirectoryInWorkspace';
  await ensureDirectoryInWorkspace(testsDirectory);

  context.telemetry.properties.lastStep = 'updateTestsSln';
  await updateTestsSln(testsDirectory, csprojFilePath);

  context.telemetry.properties.lastStep = 'syncCloudSettings';
  await syncCloudSettings(context, vscode.Uri.file(projectPath));

  const successMessage = localize(
    'generateTestsSuccess',
    'Tests generated successfully for workflow "{0}" at: "{1}".',
    workflowName,
    logicAppTestFolderPath
  );
  ext.outputChannel.appendLog(successMessage);
  vscode.window.showInformationMessage(successMessage);
}

/**
 * Constructs the executed action chain (including nested actions in order) for a given path.
 * @param {PathNode[]} path - The path to construct the action chain for.
 * @returns {PathNode[]} - The constructed action chain.
 */
function getExecutedActionChain(path: PathNode[]): PathNode[] {
  const actionChain: PathNode[] = [];

  for (const actionNode of path) {
    if (actionNode.type === 'Switch' || actionNode.type === 'If' || actionNode.type === 'Scope') {
      actionChain.push(...getExecutedActionChain((actionNode as ParentPathNode).actions));
    } else {
      actionChain.push(actionNode);
    }
  }

  return actionChain;
}

/**
 * Filters the action chain to only include actions that are mockable.
 * @param {PathNode[]} actionChain - The executed action chain.
 * @param {Record<string, string>} foundActionMocks - The found action mocks.
 * @returns {PathNode[]} - The filtered action chain containing only mockable actions.
 */
function getMockableExecutedActions(actionChain: PathNode[], foundActionMocks: Record<string, string>): PathNode[] {
  return actionChain.filter((actionNode) => actionNode.name in foundActionMocks);
}

/**
 * Gets a string name for the action path.
 * @param {number} index - The index of the path in the list of paths.
 * @param {string} overallStatus - The overall status of the path.
 * @returns {string} - A string name for the action path.
 */
function getPathName(index: number, overallStatus: string): string {
  return `Path${index}_${overallStatus}`;
}

/**
 * Gets a string description of the action path.
 * @param {PathNode[]} actionChain - The executed action chain.
 * @returns {string} - A string description of the action path.
 */
function getPathDescription(actionChain: PathNode[]): string {
  return actionChain.map((action) => `[${action.status}] ${action.name}`).join(' -> ');
}

/**
 * Gets all action assertions for a given action node, including nested actions if applicable.
 * @param {PathNode} actionNode - The action node to get assertions for.
 * @param {string} [nestedActionPath] - The nested action path on TestWorkflowRun object.
 * @returns {Promise<string[]>} - A Promise that resolves to an array of action assertion strings.
 */
async function getActionAssertion(actionNode: PathNode, nestedActionPath = ''): Promise<string[]> {
  const actionAssertionTemplateFileName = 'TestActionAssertion';
  const actionAssertionTemplatePath = path.join(__dirname, assetsFolderName, unitTestTemplatesFolderName, actionAssertionTemplateFileName);
  const actionAssertionTemplate = await fse.readFile(actionAssertionTemplatePath, 'utf-8');

  const childActionAssertions =
    actionNode.type === 'Switch' || actionNode.type === 'If' || actionNode.type === 'Scope'
      ? (
          await Promise.all(
            (actionNode as ParentPathNode).actions.map((childActionNode) =>
              getActionAssertion(childActionNode, `${nestedActionPath}["${actionNode.name}"].ChildActions`)
            )
          )
        ).flat()
      : [];

  return [
    actionAssertionTemplate
      .replace(/<%= ActionName %>/g, actionNode.name)
      .replace(/<%= ActionStatus %>/g, toTestWorkflowStatus(actionNode.status))
      .replace(/<%= NestedActionPath %>/g, nestedActionPath),
    ...childActionAssertions,
  ];
}

/**
 * Gets a string representation of the action mock dictionary item for a given action node.
 * @param {PathNode} actionNode - The action node to get the mock entry for.
 * @param {Record<string, string>} foundActionMocks - The found action mocks.
 * @returns {string} - A string representation of the action mock dictionary item.
 */
function getTestDataActionMockEntry(actionNode: PathNode, foundActionMocks: Record<string, string>): string {
  const actionMockOutputClassName = foundActionMocks[actionNode.name];
  const actionMockClassName = actionMockOutputClassName?.replace(/(.*)Output$/, '$1Mock');

  return `{ "${actionNode.name}", new ${actionMockClassName}(status: ${toTestWorkflowStatus(actionNode.status)}, outputs: new ${actionMockOutputClassName}()) }`;
}

/**
 * Converts a workflow status string to a TestWorkflowStatus enum string.
 * @param {string} status - The workflow status to convert.
 * @returns {string} - The corresponding TestWorkflowStatus enum string.
 */
function toTestWorkflowStatus(status: string): string {
  return `TestWorkflowStatus.${status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}`;
}
