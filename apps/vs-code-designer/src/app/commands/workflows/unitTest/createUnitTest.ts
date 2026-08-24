/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import {
  createTestCsFile,
  createTestSettingsConfigFile,
  createTestExecutorFile,
  ensureCsproj,
  updateCsprojFile,
  getUnitTestPaths,
  parseUnitTestOutputs,
  promptForUnitTestName,
  getOperationMockClassContent,
  updateTestsSln,
  validateWorkflowPath,
  selectWorkflowNode,
} from '../../../utils/unitTest/unitTest';
import { ensureDirectoryInWorkspace, getLogicAppProjectRoot, getParentLogicAppRoot, getWorkflowNode } from '../../../utils/workspace';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { ext } from '../../../../extensionVariables';
import { ensureWorkspace } from '../../ensureWorkspace';
import { syncCloudSettings } from '../../syncCloudSettings';

/**
 * Creates a unit test for a Logic App workflow (codeful only), with telemetry logging and error handling.
 * @param context - The action context.
 * @param {vscode.Uri | undefined} node - The URI of the workflow node, if available.
 * @param {any} nodeOutputOperations - The operation info and output parameters of the workflow node.
 * @returns {Promise<void>} - A Promise that resolves when the unit test is created.
 */
export async function createUnitTest(context: IActionContext, node: vscode.Uri | undefined, nodeOutputOperations: any): Promise<void> {
  context.telemetry.properties.lastStep = 'ensureWorkspace';
  const isWorkspaceReady = await callWithTelemetryAndErrorHandling(
    'createUnitTest.ensureWorkspace',
    async (actionContext: IActionContext) => {
      actionContext.errorHandling.rethrow = true;
      actionContext.errorHandling.suppressDisplay = true;
      return await ensureWorkspace(actionContext);
    }
  );

  if (!isWorkspaceReady) {
    context.telemetry.properties.multiRootWorkspaceValid = 'false';
    ext.outputChannel.appendLog(
      localize('createUnitTestCancelled', 'Exiting unit test creation, a workspace is required to create unit tests.')
    );
    context.telemetry.properties.result = 'Canceled';
    return;
  }

  // Get parsed outputs
  context.telemetry.properties.lastStep = 'parseUnitTestOutputs';
  const parsedOutputs = await parseUnitTestOutputs(nodeOutputOperations);
  const operationInfo = parsedOutputs['operationInfo'];
  const outputParameters = parsedOutputs['outputParameters'];
  context.telemetry.properties.operationInfoExists = operationInfo ? 'true' : 'false';
  context.telemetry.properties.outputParametersExists = outputParameters ? 'true' : 'false';

  context.telemetry.properties.lastStep = 'getWorkflowNode';
  let workflowNode = getWorkflowNode(node) as vscode.Uri;

  context.telemetry.properties.lastStep = 'getLogicAppProjectRoot';
  const projectPath = workflowNode ? await getParentLogicAppRoot(workflowNode.fsPath) : await getLogicAppProjectRoot(context);

  if (!projectPath) {
    throw new Error(localize('LogicAppRootError', 'Unable to determine logic app project root folder.'));
  }

  if (!workflowNode) {
    context.telemetry.properties.lastStep = 'selectWorkflowNode';
    workflowNode = await selectWorkflowNode(context, projectPath);
  }
  context.telemetry.properties.workflowNodePath = workflowNode.fsPath;

  context.telemetry.properties.lastStep = 'validateWorkflowPath';
  validateWorkflowPath(projectPath, workflowNode.fsPath);

  context.telemetry.properties.lastStep = 'promptForUnitTestName';
  const workflowName = path.basename(path.dirname(workflowNode.fsPath));
  const unitTestName = await promptForUnitTestName(context, projectPath, workflowName);
  context.telemetry.properties.workflowName = workflowName;
  context.telemetry.properties.unitTestName = unitTestName;

  context.telemetry.properties.lastStep = 'getUnitTestPaths';
  const { unitTestFolderPath, logicAppName, logicAppTestFolderPath, testsDirectory } = getUnitTestPaths(
    projectPath,
    workflowName,
    unitTestName
  );

  context.telemetry.properties.lastStep = 'getOperationMockClassContent';
  const { mockClassContent, foundActionMocks, foundTriggerMocks } = await getOperationMockClassContent(
    operationInfo,
    outputParameters,
    workflowNode.fsPath,
    workflowName,
    logicAppName
  );

  if (!foundTriggerMocks || Object.keys(foundTriggerMocks).length === 0) {
    throw new Error(localize('noTriggersFound', 'No trigger found in the workflow. Unit tests must include a mocked trigger.'));
  }

  context.telemetry.properties.lastStep = 'generateUnitTest';
  await generateUnitTest(context, projectPath, workflowName, unitTestName, mockClassContent, foundActionMocks, foundTriggerMocks);

  const csprojFilePath = path.join(logicAppTestFolderPath, `${logicAppName}.csproj`);

  context.telemetry.properties.lastStep = 'updateTestsSln';
  try {
    ext.outputChannel.appendLog(`Updating solution in tests folder: ${unitTestFolderPath}`);
    await updateTestsSln(testsDirectory, csprojFilePath);
  } catch (error) {
    ext.outputChannel.appendLog(
      localize(
        'updateTestsSlnError',
        'Failed to update solution in tests folder. Error: "{0}".',
        error instanceof Error ? error.message : String(error)
      )
    );
  }

  context.telemetry.properties.lastStep = 'syncCloudSettings';
  await syncCloudSettings(context, vscode.Uri.file(projectPath));
}

/**
 * Generates a codeful unit test by calling the backend API, unzipping the response, and creating the .cs file.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path to the project directory.
 * @param {string} workflowName - The name of the workflow for which the test is being created.
 * @param {string} unitTestName - The name of the unit test to be created.
 * @param {Record<string, string>} mockClassContent - The content of the mock classes.
 * @param {Record<string, string>} foundActionMocks - The action mocks found in the workflow.
 * @param {Record<string, string>} foundTriggerMocks - The trigger mocks found in the workflow.
 * @returns {Promise<void>} - A promise that resolves when the unit test has been generated.
 */
async function generateUnitTest(
  context: IActionContext,
  projectPath: string,
  workflowName: string,
  unitTestName: string,
  mockClassContent: Record<string, string>,
  foundActionMocks: Record<string, string>,
  foundTriggerMocks: Record<string, string>
): Promise<void> {
  // Get required paths
  const { testsDirectory, logicAppName, logicAppTestFolderPath, workflowTestFolderPath, mocksFolderPath, unitTestFolderPath } =
    getUnitTestPaths(projectPath, workflowName, unitTestName);

  // Get cleaned versions of strings
  const cleanedUnitTestName = unitTestName.replace(/-/g, '_');
  const cleanedWorkflowName = workflowName.replace(/-/g, '_');
  const cleanedLogicAppName = logicAppName.replace(/-/g, '_');

  // Ensure directories exist
  ext.outputChannel.appendLog(localize('ensuringDirectories', 'Ensuring required directories exist...'));
  await Promise.all([
    fse.ensureDir(logicAppTestFolderPath),
    fse.ensureDir(workflowTestFolderPath),
    fse.ensureDir(unitTestFolderPath),
    fse.ensureDir(mocksFolderPath),
  ]);

  // Create the testSettings.config and TestExecutor.cs files
  ext.outputChannel.appendLog(localize('ensureTestProjectFiles', 'Ensuring test project files...'));
  context.telemetry.properties.lastStep = 'createTestSettingsConfigFile';
  await createTestSettingsConfigFile(workflowTestFolderPath, workflowName, logicAppName);

  context.telemetry.properties.lastStep = 'createTestExecutorFile';
  await createTestExecutorFile(logicAppTestFolderPath, cleanedLogicAppName);

  const [actionName, actionOutputClassName] = Object.entries(foundActionMocks)[0] || [];
  const [, triggerOutputClassName] = Object.entries(foundTriggerMocks)[0] || [];

  // Create actionMockClassName by replacing "Output" with "Mock" in actionOutputClassName
  const actionMockClassName = actionOutputClassName?.replace(/(.*)Output$/, '$1Mock');
  const triggerMockClassName = triggerOutputClassName.replace(/(.*)Output$/, '$1Mock');

  // Create the mock files
  context.telemetry.properties.lastStep = 'createMockClasses';
  for (const [mockClassName, classContent] of Object.entries(mockClassContent)) {
    const mockFilePath = path.join(mocksFolderPath, `${mockClassName}.cs`);
    await fse.writeFile(mockFilePath, classContent, 'utf-8');
    ext.outputChannel.appendLog(localize('csMockFileCreated', 'Created mock class file at: "{0}".', mockFilePath));
  }

  // Create the .cs file for the unit test
  context.telemetry.properties.lastStep = 'createTestCsFile';
  await createTestCsFile(
    unitTestFolderPath,
    unitTestName,
    cleanedUnitTestName,
    workflowName,
    cleanedWorkflowName,
    cleanedLogicAppName,
    actionName,
    actionOutputClassName,
    actionMockClassName,
    triggerOutputClassName,
    triggerMockClassName,
    true
  );

  // Ensure .csproj file exists
  ext.outputChannel.appendLog(localize('ensuringCsproj', 'Ensuring .csproj file exists...'));
  context.telemetry.properties.lastStep = 'ensureCsproj';
  await ensureCsproj(logicAppTestFolderPath, logicAppName);

  // Update .csproj file with content include for the workflow
  context.telemetry.properties.lastStep = 'updateCsprojFile';
  const csprojFilePath = path.join(logicAppTestFolderPath, `${logicAppName}.csproj`);
  await updateCsprojFile(csprojFilePath, workflowName);

  // Add testsDirectory to workspace if not already included
  context.telemetry.properties.lastStep = 'ensureTestsDirectoryInWorkspace';
  ext.outputChannel.appendLog(localize('ensureTestsDirectory', 'Ensuring tests directory exists in workspace...'));
  await ensureDirectoryInWorkspace(testsDirectory);

  context.telemetry.properties.unitTestGenerationStatus = 'Success';
  ext.outputChannel.appendLog(
    localize('generateCodefulUnitTest', 'Successfully created unit test "{0}" at "{1}".', unitTestName, unitTestFolderPath)
  );
}
