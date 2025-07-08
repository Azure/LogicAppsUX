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
  handleError,
  logError,
  logSuccess,
  logTelemetry,
  parseUnitTestOutputs,
  promptForUnitTestName,
  selectWorkflowNode,
  getOperationMockClassContent,
  updateTestsSln,
  validateWorkflowPath,
} from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { ensureDirectoryInWorkspace, getWorkflowNode, getWorkspaceFolder, getWorkspacePath } from '../../../utils/workspace';
import { type IActionContext, parseError } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { ext } from '../../../../extensionVariables';
import { convertToWorkspace } from '../../createNewCodeProject/CodeProjectBase/ConvertToWorkspace';
import { syncCloudSettings } from '../../syncCloudSettings';

/**
 * Creates a unit test for a Logic App workflow (codeful only), with telemetry logging and error handling.
 * @param {IActionContext} context - The action context.
 * @param {vscode.Uri | undefined} node - The URI of the workflow node, if available.
 * @param {any} unitTestDefinition - The definition of the unit test.
 * @returns {Promise<void>} - A Promise that resolves when the unit test is created.
 */
export async function saveBlankUnitTest(context: IActionContext, node: vscode.Uri | undefined, unitTestDefinition: any): Promise<void> {
  const startTime = Date.now();

  // Initialize telemetry properties
  logTelemetry(context, {
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
      logTelemetry(context, {
        multiRootWorkspaceValid: 'false',
      });
      ext.outputChannel.appendLog(
        localize('createBlankUnitTestCancelled', 'Exiting blank unit test creation, a workspace is required to create blank unit tests.')
      );
      context.telemetry.properties.result = 'Canceled';
      return;
    }
    logTelemetry(context, {
      multiRootWorkspaceValid: 'true',
      workspaceLocated: 'true',
      projectRootLocated: 'true',
    });

    // Get parsed outputs
    context.telemetry.properties.lastStep = 'parseUnitTestOutputs';
    const parsedOutputs = await parseUnitTestOutputs(unitTestDefinition);
    const operationInfo = parsedOutputs['operationInfo'];
    const outputParameters = parsedOutputs['outputParameters'];
    logTelemetry(context, {
      operationInfoExists: operationInfo ? 'true' : 'false',
      outputParametersExists: outputParameters ? 'true' : 'false',
    });

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
    logTelemetry(context, {
      workflowNodeSelected: 'true',
      workflowNodePath: workflowNode ? workflowNode.fsPath : '',
    });

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
    logTelemetry(context, {
      unitTestNamePrompted: 'true',
    });

    context.telemetry.properties.lastStep = 'getUnitTestPaths';
    const { unitTestFolderPath, logicAppName, workflowTestFolderPath, logicAppTestFolderPath, testsDirectory } = getUnitTestPaths(
      projectPath,
      workflowName,
      unitTestName
    );
    logTelemetry(context, {
      workflowTestFolderPathResolved: workflowTestFolderPath ? 'true' : 'false',
    });

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
    logTelemetry(context, { workflowName, unitTestName });

    // Save the unit test
    context.telemetry.properties.lastStep = 'generateBlankCodefulUnitTest';
    await generateBlankCodefulUnitTest(
      context,
      projectPath,
      workflowName,
      unitTestName,
      mockClassContent,
      foundActionMocks,
      foundTriggerMocks
    );
    logTelemetry(context, {
      unitTestSaveStatus: 'Success',
      unitTestProcessingTimeMs: (Date.now() - startTime).toString(),
    });

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
    // Handle errors using the helper function
    logTelemetry(context, {
      unitTestGenerationStatus: 'Failed',
      errorMessage: parseError(error).message,
    });
    handleError(context, error, 'saveBlankUnitTest');
  }
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
async function generateBlankCodefulUnitTest(
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
      logicAppName,
      cleanedLogicAppName,
      actionName,
      actionOutputClassName,
      actionMockClassName,
      triggerOutputClassName,
      triggerMockClassName,
      true
    );
    logTelemetry(context, { csFileCreated: 'true' });

    // Ensure .csproj file exists
    ext.outputChannel.appendLog(localize('ensuringCsproj', 'Ensuring .csproj file exists...'));
    await ensureCsproj(testsDirectory, logicAppTestFolderPath, logicAppName);
    logTelemetry(context, { csprojValid: 'true' });

    // Update .csproj file with content include for the workflow
    context.telemetry.properties.lastStep = 'updateCsprojFile';
    const csprojFilePath = path.join(logicAppTestFolderPath, `${logicAppName}.csproj`);
    const isCsprojUpdated = await updateCsprojFile(csprojFilePath, workflowName);
    logTelemetry(context, { csprojUpdated: isCsprojUpdated ? 'true' : 'false' });

    // Add testsDirectory to workspace if not already included
    try {
      context.telemetry.properties.lastStep = 'ensureTestsDirectoryInWorkspace';
      ext.outputChannel.appendLog(localize('ensureTestsDirectory', 'Ensuring tests directory exists in workspace...'));
      await ensureDirectoryInWorkspace(testsDirectory);
      logTelemetry(context, {
        workspaceUpdatedStatus: 'true',
      });
    } catch (workspaceError) {
      const reason = parseError(workspaceError).message;
      logTelemetry(context, {
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
    logSuccess(context, 'unitTestGenerationStatus', successMessage);
    vscode.window.showInformationMessage(successMessage);
  } catch (error) {
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = error.message ?? error;
    logError(context, error, 'generateBlankCodefulUnitTest');
  }
}
