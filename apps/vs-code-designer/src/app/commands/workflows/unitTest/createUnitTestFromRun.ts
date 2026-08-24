/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../localize';
import { ensureWorkspace } from '../../ensureWorkspace';
import {
  createTestCsFile,
  createTestExecutorFile,
  createTestSettingsConfigFile,
  ensureCsproj,
  updateCsprojFile,
  extractAndValidateRunId,
  getUnitTestPaths,
  parseUnitTestOutputs,
  getOperationMockClassContent,
  promptForUnitTestName,
  updateTestsSln,
  validateWorkflowPath,
  selectWorkflowNode,
} from '../../../utils/unitTest/unitTest';
import { ensureDirectoryInWorkspace, getLogicAppProjectRoot, getParentLogicAppRoot, getWorkflowNode } from '../../../utils/workspace';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import axios from 'axios';
import { ext } from '../../../../extensionVariables';
import { unzipLogicAppArtifacts } from '../../../utils/taskUtils';
import { syncCloudSettings } from '../../syncCloudSettings';

/**
 * Handles the creation of a unit test for a Logic App workflow.
 * Validates input, manages workflow node selection, and triggers unit test generation.
 * @param {IActionContext} context - The action context.
 * @param {vscode.Uri | undefined} node - Optional URI of the workflow node.
 * @param {string | undefined} runId - Optional run ID.
 * @param {any} nodeOutputOperations - The operation info and output parameters of the workflow node.
 * @returns {Promise<void>} Resolves when the unit test creation process completes.
 */
export async function createUnitTestFromRun(
  context: IActionContext,
  node: vscode.Uri | undefined,
  runId?: string,
  nodeOutputOperations?: any
): Promise<void> {
  context.telemetry.properties.lastStep = 'extractAndValidateRunId';
  const validatedRunId = await extractAndValidateRunId(runId);

  context.telemetry.properties.lastStep = 'ensureWorkspace';
  const isWorkspaceReady = await callWithTelemetryAndErrorHandling(
    'createUnitTestFromRun.ensureWorkspace',
    async (actionContext: IActionContext) => {
      actionContext.errorHandling.rethrow = true;
      actionContext.errorHandling.suppressDisplay = true;
      return await ensureWorkspace(actionContext);
    }
  );

  if (!isWorkspaceReady) {
    ext.outputChannel.appendLog(
      localize('createUnitTestFromRunCancelled', 'Exiting unit test creation, a workspace is required to create unit tests.')
    );
    context.telemetry.properties.result = 'Canceled';
    return;
  }

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

  // Get workflow name and prompt for unit test name
  context.telemetry.properties.lastStep = 'promptForUnitTestName';
  const workflowName = path.basename(path.dirname(workflowNode.fsPath));
  const unitTestName = await promptForUnitTestName(context, projectPath, workflowName);
  Object.assign(context.telemetry.properties, {
    workflowName: workflowName,
    unitTestName: unitTestName,
    runId: validatedRunId,
  });

  context.telemetry.properties.lastStep = 'generateUnitTestFromRun';
  await generateUnitTestFromRun(context, projectPath, workflowName, unitTestName, validatedRunId, nodeOutputOperations, node.fsPath);
}

/**
/**
 * Generates a codeful unit test by calling the backend API, processing the response, and creating necessary files.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - Path to the project directory.
 * @param {string} workflowName - Name of the workflow.
 * @param {string} unitTestName - Name of the unit test.
 * @param {string} runId - Run ID.
 * @param {any} nodeOutputOperations - The operation info and output parameters of the workflow node.
 * @returns {Promise<void>} Resolves when the unit test has been generated.
 */
async function generateUnitTestFromRun(
  context: IActionContext,
  projectPath: string,
  workflowName: string,
  unitTestName: string,
  runId: string,
  nodeOutputOperations: any,
  workflowPath: string
): Promise<void> {
  if (!runId) {
    throw new Error(localize('runIdMissing', 'Run ID is required to generate a unit test from run.'));
  }

  if (!ext.workflowRuntimePort) {
    throw new Error(localize('workflowRuntimeNotRunning', 'Workflow runtime is not running. Start the runtime and try again.'));
  }

  ext.outputChannel.appendLog(
    localize('operationalContext', 'Creating unit test "{0}" for workflow "{1}", runId "{2}".', unitTestName, workflowName, runId)
  );

  context.telemetry.properties.lastStep = 'parseUnitTestOutputs';
  const parsedOutputs = await parseUnitTestOutputs(nodeOutputOperations);
  const operationInfo = parsedOutputs['operationInfo'];
  const outputParameters = parsedOutputs['outputParameters'];
  Object.assign(context.telemetry.properties, {
    operationInfoExists: operationInfo ? 'true' : 'false',
    outputParametersExists: outputParameters ? 'true' : 'false',
  });

  const baseUrl = `http://localhost:${ext.workflowRuntimePort}`;
  const apiUrl = `${baseUrl}/runtime/webhooks/workflow/api/management/workflows/${encodeURIComponent(workflowName)}/runs/${encodeURIComponent(runId)}/generateUnitTest`;

  ext.outputChannel.appendLog(localize('initiatingApiCall', 'Fetching unit test details from run...'));

  context.telemetry.properties.lastStep = 'postGenerateUnitTest';
  const response: any = await axios.post(
    apiUrl,
    { UnitTestName: unitTestName },
    {
      headers: {
        Accept: 'application/zip',
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 30000,
    }
  );

  const zipBuffer = Buffer.from(response.data);
  const contentType = response.headers['content-type'];
  if (contentType !== 'application/zip') {
    throw new Error(localize('invalidResponseType', `Expected a zip file but received ${contentType}`));
  }

  context.telemetry.properties.lastStep = 'getUnitTestPaths';
  const paths = getUnitTestPaths(projectPath, workflowName, unitTestName);

  context.telemetry.properties.lastStep = 'getOperationMockClassContent';
  const { mockClassContent, foundActionMocks, foundTriggerMocks } = await getOperationMockClassContent(
    operationInfo,
    outputParameters,
    workflowPath,
    workflowName,
    paths.logicAppName
  );

  if (!foundTriggerMocks || Object.keys(foundTriggerMocks).length === 0) {
    throw new Error(localize('noTriggersFound', 'No trigger found in the workflow. Unit tests must include a mocked trigger.'));
  }

  // Get cleaned versions of strings
  const cleanedUnitTestName = unitTestName.replace(/-/g, '_');
  const cleanedWorkflowName = workflowName.replace(/-/g, '_');
  const cleanedLogicAppName = paths.logicAppName.replace(/-/g, '_');

  context.telemetry.properties.lastStep = 'unzipLogicAppArtifacts';
  await fse.ensureDir(paths.unitTestFolderPath);
  ext.outputChannel.appendLog(localize('unzippingFiles', `Unzipping Mock.json into: ${paths.unitTestFolderPath}`));
  await unzipLogicAppArtifacts(zipBuffer, paths.unitTestFolderPath);

  // Create the testSettings.config and TestExecutor.cs files
  ext.outputChannel.appendLog(localize('ensureTestProjectFiles', 'Ensuring test project files...'));
  context.telemetry.properties.lastStep = 'createTestSettingsConfigFile';
  await createTestSettingsConfigFile(paths.workflowTestFolderPath, workflowName, paths.logicAppName);

  context.telemetry.properties.lastStep = 'createTestExecutorFile';
  await createTestExecutorFile(paths.logicAppTestFolderPath, cleanedLogicAppName);

  const [actionName, actionOutputClassName] = Object.entries(foundActionMocks)[0] || [];
  const [, triggerOutputClassName] = Object.entries(foundTriggerMocks)[0] || [];

  // Create actionMockClassName by replacing "Output" with "Mock" in actionOutputClassName
  const actionMockClassName = actionOutputClassName?.replace(/(.*)Output$/, '$1Mock');
  const triggerMockClassName = triggerOutputClassName.replace(/(.*)Output$/, '$1Mock');

  context.telemetry.properties.lastStep = 'createMockClasses';
  await fse.ensureDir(paths.mocksFolderPath);
  for (const [mockClassName, classContent] of Object.entries(mockClassContent)) {
    const mockFilePath = path.join(paths.mocksFolderPath, `${mockClassName}.cs`);
    await fse.writeFile(mockFilePath, classContent, 'utf-8');
    ext.outputChannel.appendLog(localize('csMockFileCreated', 'Created mock class file at: "{0}".', mockFilePath));
  }

  context.telemetry.properties.lastStep = 'createTestCsFile';
  await createTestCsFile(
    paths.unitTestFolderPath!,
    unitTestName,
    cleanedUnitTestName,
    workflowName,
    cleanedWorkflowName,
    cleanedLogicAppName,
    actionName,
    actionOutputClassName,
    actionMockClassName,
    triggerOutputClassName,
    triggerMockClassName
  );

  context.telemetry.properties.lastStep = 'ensureCsproj';
  await ensureCsproj(paths.logicAppTestFolderPath, paths.logicAppName);

  context.telemetry.properties.lastStep = 'updateCsprojFile';
  const csprojFilePath = path.join(paths.logicAppTestFolderPath, `${paths.logicAppName}.csproj`);
  await updateCsprojFile(csprojFilePath, workflowName);

  context.telemetry.properties.lastStep = 'ensureTestsDirectoryInWorkspace';
  ext.outputChannel.appendLog(localize('ensureTestsDirectory', 'Ensuring tests directory exists in workspace...'));
  await ensureDirectoryInWorkspace(paths.testsDirectory);

  ext.outputChannel.appendLog(
    localize('generateCodefulUnitTest', 'Successfully created unit test "{0}" at "{1}".', unitTestName, paths.unitTestFolderPath)
  );

  context.telemetry.properties.lastStep = 'updateTestsSln';
  try {
    ext.outputChannel.appendLog(`Updating solution in tests folder: ${paths.testsDirectory}`);
    await updateTestsSln(paths.testsDirectory, csprojFilePath);
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
