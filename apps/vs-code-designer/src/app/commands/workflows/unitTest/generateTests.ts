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
  validateWorkflowPath,
} from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { assetsFolderName, unitTestTemplatesFolderName } from '../../../../constants';

/**
 * Generates unit tests for a Logic App workflow based on its execution paths.
 * @param {IActionContext} context - The action context.
 * @param {Uri | undefined} node - The URI of the workflow node, if available.
 * @param {any} operationData - The original operation data with operationInfo and outputParameters.
 * @returns {Promise<void>} - A Promise that resolves when the unit tests are generated.
 */
export async function generateTests(context: IActionContext, node: Uri | undefined, operationData: any): Promise<void> {
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

  const { operationInfo, outputParameters } = await preprocessOutputParameters(operationData);
  const workspaceFolder = getWorkspacePath(workflowNode.fsPath);
  const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
  validateWorkflowPath(projectPath, workflowNode.fsPath);
  const workflowName = path.basename(path.dirname(workflowNode.fsPath));
  const { testsDirectory, logicAppName, logicAppTestFolderPath, workflowTestFolderPath, mocksFolderPath } = getUnitTestPaths(
    projectPath,
    workflowName
  );
  const { mockClassContent, foundActionMocks, foundTriggerMocks } = await getOperationMockClassContent(
    operationInfo,
    outputParameters,
    workflowNode.fsPath,
    workflowName,
    logicAppName
  );

  const workflowNameCleaned = workflowName.replace(/-/g, '_');
  const logicAppNameCleaned = logicAppName.replace(/-/g, '_');

  const testCaseMethods: string[] = [];
  for (const scenario of paths) {
    const triggerNode = scenario.path[0];
    const triggerMockOutputClassName = foundTriggerMocks[triggerNode.name];
    const triggerMockClassName = triggerMockOutputClassName?.replace(/(.*)Output$/, '$1Mock');
    if (!triggerMockOutputClassName) {
      throw new Error(localize('generateTestsNoTriggerMock', 'No mock found for trigger: {0}', triggerNode.name));
    }

    const pathActions = scenario.path.slice(1);
    const actionChain = getExecutedActionChain(pathActions);
    const actionMocks = (await Promise.all(pathActions.map((actionNode) => getActionMock(actionNode, foundActionMocks)))).flat();
    const actionAssertions = (await Promise.all(pathActions.map((actionNode) => getActionAssertion(actionNode)))).flat();

    const testCaseMethodTemplateFileName = 'TestCaseMethod';
    const testCaseMethodTemplatePath = path.join(__dirname, assetsFolderName, unitTestTemplatesFolderName, testCaseMethodTemplateFileName);
    const testCaseMethodTemplate = await fse.readFile(testCaseMethodTemplatePath, 'utf-8');

    testCaseMethods.push(
      testCaseMethodTemplate
        .replace(/<%= WorkflowName %>/g, workflowName)
        .replace(/<%= WorkflowNameCleaned %>/g, workflowNameCleaned)
        .replace(/<%= PathDescriptionString %>/g, getPathDescription(actionChain))
        .replace(/<%= PathName %>/g, getPathName(scenario.overallStatus, actionChain))
        .replace(/<%= TriggerMockOutputClassName %>/g, triggerMockOutputClassName)
        .replace(/<%= TriggerMockClassName %>/g, triggerMockClassName)
        .replace(/<%= ActionMocksContent %>/g, actionMocks.join('\n\n'))
        .replace(/<%= ActionAssertionsContent %>/g, actionAssertions.join('\n\n'))
        .replace(/<%= PathOverallStatus %>/g, toTestWorkflowStatus(scenario.overallStatus))
    );
  }

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

  const testClassTemplateFileName = 'GenericTestClass';
  const testClassTemplatePath = path.join(__dirname, assetsFolderName, unitTestTemplatesFolderName, testClassTemplateFileName);
  const testClassTemplate = await fse.readFile(testClassTemplatePath, 'utf-8');
  const testClassContent = testClassTemplate
    .replace(/<%= WorkflowName %>/g, workflowName)
    .replace(/<%= LogicAppNameCleaned %>/g, logicAppNameCleaned)
    .replace(/<%= WorkflowNameCleaned %>/g, workflowNameCleaned)
    .replace(/<%= TestClassContent %>/g, testCaseMethods.join('\n\n'));
  const csFilePath = path.join(workflowTestFolderPath, `${workflowNameCleaned}Tests.cs`);
  await fse.writeFile(csFilePath, testClassContent);

  await ensureCsproj(testsDirectory, logicAppTestFolderPath, logicAppName);
  context.telemetry.properties.lastStep = 'updateCsprojFile';
  const csprojFilePath = path.join(logicAppTestFolderPath, `${logicAppName}.csproj`);
  await updateCsprojFile(csprojFilePath, workflowName);

  context.telemetry.properties.lastStep = 'ensureTestsDirectoryInWorkspace';
  await ensureDirectoryInWorkspace(testsDirectory);
}

/**
 * Gets all action mocks for a given action node, including nested actions if applicable.
 * @param {PathNode} actionNode - The action node to get mocks for.
 * @param {Record<string, string>} foundActionMocks - The mockable actions.
 * @returns {Promise<string[]>} - A Promise that resolves to an array of action mock strings.
 */
async function getActionMock(actionNode: PathNode, foundActionMocks: Record<string, string>): Promise<string[]> {
  const actionMockOutputClassName = foundActionMocks[actionNode.name];
  const actionMockClassName = actionMockOutputClassName?.replace(/(.*)Output$/, '$1Mock');

  if (actionNode.type === 'Switch' || actionNode.type === 'If') {
    return (
      await Promise.all((actionNode as ParentPathNode).actions.map((childActionNode) => getActionMock(childActionNode, foundActionMocks)))
    ).flat();
  }

  if (actionMockOutputClassName === undefined) {
    return [];
  }

  const actionMockTemplateFileName = 'TestActionMock';
  const actionMockTemplatePath = path.join(__dirname, assetsFolderName, unitTestTemplatesFolderName, actionMockTemplateFileName);
  const actionMockTemplate = await fse.readFile(actionMockTemplatePath, 'utf-8');

  return [
    actionMockTemplate
      .replace(/<%= ActionName %>/g, actionNode.name)
      .replace(/<%= ActionMockStatus %>/g, toTestWorkflowStatus(actionNode.status))
      .replace(/<%= ActionMockOutputClassName %>/g, actionMockOutputClassName)
      .replace(/<%= ActionMockClassName %>/g, actionMockClassName),
  ];
}

/**
 * Gets all action assertions for a given action node, including nested actions if applicable.
 * @param {PathNode} actionNode - The action node to get assertions for.
 * @returns {Promise<string[]>} - A Promise that resolves to an array of action assertion strings.
 */
async function getActionAssertion(actionNode: PathNode): Promise<string[]> {
  const actionAssertionTemplateFileName = 'TestActionAssertion';
  const actionAssertionTemplatePath = path.join(__dirname, assetsFolderName, unitTestTemplatesFolderName, actionAssertionTemplateFileName);
  const actionAssertionTemplate = await fse.readFile(actionAssertionTemplatePath, 'utf-8');

  const childActionAssertions =
    actionNode.type === 'Switch' || actionNode.type === 'If'
      ? (await Promise.all((actionNode as ParentPathNode).actions.map((childActionNode) => getActionAssertion(childActionNode)))).flat()
      : [];

  return [
    actionAssertionTemplate
      .replace(/<%= ActionName %>/g, actionNode.name)
      .replace(/<%= ActionStatus %>/g, toTestWorkflowStatus(actionNode.status)),
    ...childActionAssertions,
  ];
}

function toTestWorkflowStatus(status: string): string {
  return `TestWorkflowStatus.${status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}`;
}

/**
 * Constructs the executed action chain (including nested actions in order) for a given path.
 * @param {PathNode[]} path - The path to construct the action chain for.
 * @returns {PathNode[]} - The constructed action chain.
 */
function getExecutedActionChain(path: PathNode[]): PathNode[] {
  const actionChain: PathNode[] = [];

  for (const actionNode of path) {
    if (actionNode.type === 'Switch' || actionNode.type === 'If') {
      actionChain.push(...getExecutedActionChain((actionNode as ParentPathNode).actions));
    } else {
      actionChain.push(actionNode);
    }
  }

  return actionChain;
}

/**
 * Gets a string description of the action path.
 * @param {PathNode[]} actionChain - The executed action chain.
 * @returns {string} - A string description of the action path.
 */
function getPathDescription(actionChain: PathNode[]): string {
  return actionChain.map((action) => action.name).join(' -> ');
}

/**
 * Gets a string name for the action path.
 * @param {string} overallStatus - The overall status of the path.
 * @param {PathNode[]} actionChain - The executed action chain.
 * @returns {string} - A string name for the action path.
 */
function getPathName(overallStatus: string, actionChain: PathNode[]): string {
  const actionChainString = actionChain.map((action) => action.name.replace(/-/g, '_')).join('_');
  return `${actionChainString}_${overallStatus}`;
}
