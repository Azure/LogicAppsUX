/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
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
} from '../../../../utils/unitTest/codefulUnitTest';
import { tryGetLogicAppProjectRoot } from '../../../../utils/verifyIsProject';
import { ensureDirectoryInWorkspace, getWorkflowNode, getWorkspaceFolder, getWorkspacePath } from '../../../../utils/workspace';
import { callWithTelemetryAndErrorHandling, type IActionContext, parseError } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { ext } from '../../../../../extensionVariables';
import { convertToWorkspace } from '../../../convertToWorkspace';
import { syncCloudSettings } from '../../../syncCloudSettings';
import { extensionCommand } from '../../../../../constants';

/**
 * Creates a unit test for a Logic App workflow (codeful only), with telemetry logging and error handling.
 * @param {vscode.Uri | undefined} node - The URI of the workflow node, if available.
 * @param {any} nodeOutputOperations - The operation info and output parameters of the workflow node.
 * @returns {Promise<void>} - A Promise that resolves when the unit test is created.
 */
export async function createUnitTest(node: vscode.Uri | undefined, nodeOutputOperations: any): Promise<void> {
  await callWithTelemetryAndErrorHandling(extensionCommand.createUnitTest, async (context: IActionContext) => {
    const startTime = Date.now();

    // Initialize telemetry properties
    Object.assign(context.telemetry.properties, {
      workspaceLocated: 'false',
      projectRootLocated: 'false',
      workflowNodeSelected: 'false',
      multiRootWorkspaceValid: 'false',
      unitTestNamePrompted: 'false',
      directoriesEnsured: 'false',
      csFileCreated: 'false',
      csprojUpdated: 'false',
      workspaceUpdated: 'false',
      unitTestDefinitionParsed: 'false',
      operationInfoExists: 'false',
      outputParametersExists: 'false',
      workflowNodePath: '',
      workflowTestFolderPathResolved: 'false',
      mockOutputsFolderPathCreated: 'false',
      mockableOperationsFound: '0',
      mockableOperationsProcessed: '0',
      mockableTriggersProcessed: '0',
      csFilesGenerated: '0',
      csFileGenerationFailures: '0',
      workspaceUpdatedStatus: 'false',
      workspaceUpdateFailureReason: '',
      unitTestSaveStatus: 'InProgress',
      unitTestSaveFailureReason: '',
    });

    try {
      context.telemetry.properties.lastStep = 'convertToWorkspace';
      if (!(await convertToWorkspace(context))) {
        context.telemetry.properties.multiRootWorkspaceValid = 'false';
        ext.outputChannel.appendLog(
          localize('createUnitTestCancelled', 'Exiting unit test creation, a workspace is required to create unit tests.')
        );
        context.telemetry.properties.result = 'Canceled';
        return;
      }
      Object.assign(context.telemetry.properties, {
        multiRootWorkspaceValid: 'true',
        workspaceLocated: 'true',
        projectRootLocated: 'true',
      });

      // Get parsed outputs
      context.telemetry.properties.lastStep = 'parseUnitTestOutputs';
      const parsedOutputs = await parseUnitTestOutputs(nodeOutputOperations);
      const operationInfo = parsedOutputs['operationInfo'];
      const outputParameters = parsedOutputs['outputParameters'];
      context.telemetry.properties.operationInfoExists = operationInfo ? 'true' : 'false';
      context.telemetry.properties.outputParametersExists = outputParameters ? 'true' : 'false';

      // Determine workflow node
      context.telemetry.properties.lastStep = 'getWorkflowNode';
      let workflowNode = getWorkflowNode(node) as vscode.Uri;
      let projectPath: string | undefined;
      if (workflowNode) {
        context.telemetry.properties.lastStep = 'getProjectRootFromWorkflowNode';
        const workspaceFolder = getWorkspacePath(workflowNode.fsPath);
        projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
      } else {
        context.telemetry.properties.lastStep = 'getProjectRootFromWorkspaceFolder';
        const workspaceFolder = await getWorkspaceFolder(context);
        projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
        context.telemetry.properties.lastStep = 'selectWorkflowNode';
        workflowNode = await selectWorkflowNode(context, projectPath);
      }
      context.telemetry.properties.workflowNodeSelected = 'true';
      context.telemetry.properties.workflowNodePath = workflowNode ? workflowNode.fsPath : '';

      try {
        context.telemetry.properties.lastStep = 'validateWorkflowPath';
        validateWorkflowPath(projectPath, workflowNode.fsPath);
      } catch (error) {
        vscode.window.showErrorMessage(`Workflow validation failed: ${error.message}`);
        context.telemetry.properties.result = 'Failed';
        context.telemetry.properties.errorMessage = error.message;
        return;
      }
      const workflowName = path.basename(path.dirname(workflowNode.fsPath));

      // Prompt for unit test name
      context.telemetry.properties.lastStep = 'promptForUnitTestName';
      const unitTestName = await promptForUnitTestName(context, projectPath, workflowName);
      context.telemetry.properties.unitTestNamePrompted = 'true';

      context.telemetry.properties.lastStep = 'getUnitTestPaths';
      const { unitTestFolderPath, logicAppName, workflowTestFolderPath, logicAppTestFolderPath, testsDirectory } = getUnitTestPaths(
        projectPath,
        workflowName,
        unitTestName
      );
      context.telemetry.properties.workflowTestFolderPathResolved = workflowTestFolderPath ? 'true' : 'false';

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
      context.telemetry.properties.workflowName = workflowName;
      context.telemetry.properties.unitTestName = unitTestName;

      // Save the unit test
      context.telemetry.properties.lastStep = 'generateUnitTest';
      await generateUnitTest(context, projectPath, workflowName, unitTestName, mockClassContent, foundActionMocks, foundTriggerMocks);
      context.telemetry.properties.unitTestSaveStatus = 'Success';
      context.telemetry.properties.unitTestProcessingTimeMs = (Date.now() - startTime).toString();

      try {
        const csprojFilePath = path.join(logicAppTestFolderPath, `${logicAppName}.csproj`);

        context.telemetry.properties.lastStep = 'updateTestsSln';
        ext.outputChannel.appendLog(`Updating solution in tests folder: ${unitTestFolderPath}`);
        await updateTestsSln(testsDirectory, csprojFilePath);
      } catch (solutionError) {
        ext.outputChannel.appendLog(`Failed to update solution: ${solutionError}`);
      }

      context.telemetry.properties.lastStep = 'syncCloudSettings';
      await syncCloudSettings(context, vscode.Uri.file(projectPath));

      context.telemetry.properties.result = 'Succeeded';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.telemetry.properties.unitTestGenerationStatus = 'Failed';
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.errorMessage = errorMessage;
      context.telemetry.properties['createUnitTestError'] = errorMessage;
      vscode.window.showErrorMessage(localize('createUnitTestError', 'An error occurred: {0}', errorMessage));
      ext.outputChannel.appendLog(localize('createUnitTestLog', 'Error in createUnitTest: {0}', errorMessage));
    }
  });
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
  try {
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
    context.telemetry.properties.csFileCreated = 'true';

    // Ensure .csproj file exists
    ext.outputChannel.appendLog(localize('ensuringCsproj', 'Ensuring .csproj file exists...'));
    await ensureCsproj(logicAppTestFolderPath, logicAppName);
    context.telemetry.properties.csprojValid = 'true';

    // Update .csproj file with content include for the workflow
    context.telemetry.properties.lastStep = 'updateCsprojFile';
    const csprojFilePath = path.join(logicAppTestFolderPath, `${logicAppName}.csproj`);
    const isCsprojUpdated = await updateCsprojFile(csprojFilePath, workflowName);
    context.telemetry.properties.csprojUpdated = isCsprojUpdated ? 'true' : 'false';

    // Add testsDirectory to workspace if not already included
    try {
      context.telemetry.properties.lastStep = 'ensureTestsDirectoryInWorkspace';
      ext.outputChannel.appendLog(localize('ensureTestsDirectory', 'Ensuring tests directory exists in workspace...'));
      await ensureDirectoryInWorkspace(testsDirectory);
      context.telemetry.properties.workspaceUpdatedStatus = 'true';
    } catch (workspaceError) {
      const reason = parseError(workspaceError).message;
      Object.assign(context.telemetry.properties, {
        workspaceUpdated: 'false',
        workspaceUpdatedStatus: 'false',
        workspaceUpdateFailureReason: reason,
      });
      throw workspaceError;
    }

    const successMessage = localize(
      'generateCodefulUnitTest',
      'Successfully created unit test "{0}" at "{1}"',
      unitTestName,
      unitTestFolderPath
    );
    context.telemetry.properties.unitTestGenerationStatus = 'Success';
    ext.outputChannel.appendLog(successMessage);
    vscode.window.showInformationMessage(successMessage);
  } catch (error) {
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = error.message ?? error;
    context.telemetry.properties.generateUnitTest = 'Failed';
    const errorMessage = error.message || localize('unknownError', 'An unknown error occurred.');
    ext.outputChannel.appendLog(errorMessage);
    vscode.window.showErrorMessage(errorMessage);
  }
}
