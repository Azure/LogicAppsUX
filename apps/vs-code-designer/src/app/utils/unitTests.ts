/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { UnitTestResult } from '@microsoft/vscode-extension-logic-apps';
import { saveUnitTestEvent, testsDirectoryName, unitTestsFileName, workflowFileName } from '../../constants';
import { type IAzureQuickPickItem, type IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import * as xml2js from 'xml2js';
import { getWorkflowsInLocalProject } from './codeless/common';
import { ext } from '../../extensionVariables';
import type { IAzureConnectorsContext } from '../commands/workflows/azureConnectorWizard';
import axios from 'axios';
import { toPascalCase } from '@microsoft/logic-apps-shared';
import { localize } from '../../localize';

/**
 * Saves the unit test definition for a workflow.
 * @param {string} projectPath The path of the project.
 * @param {string} workflowName The name of the workflow.
 * @param {string} unitTestName The name of the unit test.
 * @param {any} unitTestDefinition The unit test definition.
 * @returns A Promise that resolves when the unit test definition is saved.
 */
export const saveUnitTestDefinition = async (
  projectPath: string,
  workflowName: string,
  unitTestName: string,
  unitTestDefinition: any
): Promise<void> => {
  await callWithTelemetryAndErrorHandling(saveUnitTestEvent, async () => {
    const options: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: localize('azureFunctions.savingWorkflow', 'Saving Unit Test Definition...'),
    };

    await vscode.window.withProgress(options, async () => {
      const projectName = path.basename(projectPath);
      const testsDirectory = getTestsDirectory(projectPath);
      const unitTestsPath = getUnitTestsPath(testsDirectory.fsPath, projectName, workflowName, unitTestName);
      const workflowTestsPath = getWorkflowTestsPath(testsDirectory.fsPath, projectName, workflowName);

      if (!fse.existsSync(workflowTestsPath)) {
        fse.mkdirSync(workflowTestsPath, { recursive: true });
      }
      try {
        fse.writeFileSync(unitTestsPath, JSON.stringify(unitTestDefinition, null, 4));
        await vscode.workspace.updateWorkspaceFolders(
          vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0,
          null,
          { uri: testsDirectory }
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `${localize('saveFailure', 'Unit Test Definition not saved.')} ${error.message}`,
          localize('OK', 'OK')
        );
        throw error;
      }
    });
  });
};

/**
 * Retrieves the name of the unit test from the given file path.
 * @param {string} filePath - The path of the unit test file.
 * @returns The name of the unit test.
 */
export const getUnitTestName = (filePath: string) => {
  const unitTestFileName = path.basename(filePath);
  const fileNameItems = unitTestFileName.split('.');
  return fileNameItems[0];
};

/**
 * Retrieves the tests directory for a given project path.
 * @param {string} projectPath - The path of the project.
 * @returns The tests directory as a `vscode.Uri` object.
 */
export const getTestsDirectory = (projectPath: string) => {
  const workspacePath = path.dirname(projectPath);
  const testsDirectory = vscode.Uri.file(path.join(workspacePath, testsDirectoryName));
  return testsDirectory;
};

/**
 * Returns the path of a unit test file for a given project, workflow, and unit test name.
 * @param {string} projectPath - The path of the project.
 * @param {string} workflowName - The name of the workflow.
 * @param {string} unitTestName - The name of the unit test.
 * @returns The path of the unit test file.
 */
const getUnitTestsPath = (projectPath: string, projectName: string, workflowName: string, unitTestName: string) => {
  return path.join(projectPath, projectName, workflowName, `${unitTestName}${unitTestsFileName}`);
};

/**
 * Returns the path to the a workflow tests directory.
 * @param {string} projectPath - The path to the project directory.
 * @param {string} workflowName - The name of the workflow.
 * @returns The path to the workflow tests directory.
 */
const getWorkflowTestsPath = (projectPath: string, projectName: string, workflowName: string) => {
  return path.join(projectPath, projectName, workflowName);
};

/**
 * Validates the unit test name.
 * @param {string} projectPath - The path of the project.
 * @param {string} workflowName - The name of the workflow.
 * @param {string | undefined} name - The unit test name to validate.
 * @returns A promise that resolves to a string if the unit test name is invalid, or undefined if it is valid.
 */
export const validateUnitTestName = async (
  projectPath: string,
  workflowName: string,
  name: string | undefined
): Promise<string | undefined> => {
  if (!name) {
    return localize('emptyUnitTestNameError', 'The unit test name cannot be empty.');
  }
  if (!/^[a-z][a-z\d_-]*$/i.test(name)) {
    return localize(
      'unitTestNameInvalidMessage',
      'Unit test name must start with a letter and can only contain letters, digits, "_" and "-".'
    );
  }

  return await validateUnitTestNameCore(projectPath, workflowName, name);
};

/**
 * Validates the unit test name for a given project, workflow, and name.
 * @param {string} projectPath - The path of the project.
 * @param {string} workflowName - The name of the workflow.
 * @param {string} name - The name of the unit test.
 * @returns A string representing an error message if a unit test with the same name already exists, otherwise undefined.
 */
const validateUnitTestNameCore = async (projectPath: string, workflowName: string, name: string): Promise<string | undefined> => {
  const projectName = path.basename(projectPath);
  const testsDirectory = getTestsDirectory(projectPath);
  const workflowTestsPath = getWorkflowTestsPath(testsDirectory.fsPath, projectName, workflowName);

  if (await fse.pathExists(path.join(workflowTestsPath, `${name}${unitTestsFileName}`))) {
    return localize('existingUnitTestError', 'A unit test with the name "{0}" already exists.', name);
  }
  return undefined;
};

/**
 * Retrieves the list of unit tests in a local project.
 * @param {string} projectPath - The path to the project.
 * @returns A promise that resolves to a record of unit test names and their corresponding file paths.
 */
export async function getUnitTestInLocalProject(projectPath: string): Promise<Record<string, string>> {
  if (!(await fse.pathExists(projectPath))) {
    return {};
  }

  const unitTests: Record<string, any> = {};

  const testFileSearch = async (directoryPath: string) => {
    const subpaths: string[] = await fse.readdir(directoryPath);

    for (const subPath of subpaths) {
      const fullPath: string = path.join(directoryPath, subPath);
      const fileStats = await fse.lstat(fullPath);
      if (fileStats.isDirectory()) {
        await testFileSearch(fullPath);
      } else if (fileStats.isFile() && fullPath.endsWith(unitTestsFileName)) {
        try {
          const relativePath = path.relative(projectPath, path.dirname(fullPath));
          const unitTestFileNameWithoutExtension = path.basename(fullPath).replace('.unit-test.json', '');
          const fileNameWithSubPath = `${relativePath} - ${unitTestFileNameWithoutExtension}`;
          unitTests[fileNameWithSubPath] = fullPath;
        } catch {
          // If unable to load the workflow or read the definition we skip the workflow
        }
      }
    }
  };
  await testFileSearch(projectPath);

  return unitTests;
}

/**
 * Prompts the user to select a unit test to edit.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path of the project.
 * @returns A promise that resolves to the selected unit test.
 */
export const pickUnitTest = async (context: IActionContext, projectPath: string) => {
  const placeHolder: string = localize('selectUnitTest', 'Select unit test to edit');
  return await context.ui.showQuickPick(getUnitTestPick(projectPath), { placeHolder });
};

/**
 * Retrieves a list of unit tests in the local project.
 * @param {string} projectPath - The path to the project.
 * @returns A promise that resolves to an array of unit test picks.
 */
const getUnitTestPick = async (projectPath: string) => {
  const listOfUnitTest = await getUnitTestInLocalProject(projectPath);
  const picks: IAzureQuickPickItem<string>[] = Array.from(Object.keys(listOfUnitTest)).map((unitTestName) => {
    return { label: unitTestName, data: listOfUnitTest[unitTestName] };
  });

  picks.sort((a, b) => a.label.localeCompare(b.label));
  return picks;
};

/**
 * Picks a unit test result from the provided test results directory.
 * @param {IActionContext} context - The action context.
 * @param {string} testResultsDirectory - The directory containing the unit test results.
 * @returns A promise that resolves to the selected unit test result.
 */
export const pickUnitTestResult = async (context: IActionContext, testResultsDirectory: string) => {
  const placeHolder: string = localize('selectUnitTest', 'Select unit result');
  return await context.ui.showQuickPick(getUnitTestResultPick(testResultsDirectory), { placeHolder });
};

/**
 * Retrieves a list of unit test results from the specified directory.
 * @param {string} testResultsDirectory - The directory where the unit test results are stored.
 * @returns A Promise that resolves to an array of objects containing the label and data of each unit test result.
 */
const getUnitTestResultsList = async (testResultsDirectory: string) => {
  const listOfUnitTestResults = await fse.readdir(testResultsDirectory);
  const list = listOfUnitTestResults.map((unitTestResult) => {
    return { label: unitTestResult.split('.')[0], data: fse.readJsonSync(path.join(testResultsDirectory, unitTestResult)) };
  });
  list.sort((a, b) => a.label.localeCompare(b.label));
  return list;
};

/**
 * Retrieves the unit test result pick from the specified test results directory.
 * @param {string} testResultsDirectory The directory where the unit test results are stored.
 * @returns A promise that resolves to an array of `IAzureQuickPickItem<UnitTestResult>`.
 */
const getUnitTestResultPick = async (testResultsDirectory: string) => {
  const picks: IAzureQuickPickItem<UnitTestResult>[] = await getUnitTestResultsList(testResultsDirectory);
  return picks;
};

/**
 * Retrieves the latest unit test result from the specified directory.
 * @param {string} testResultsDirectory - The directory where the unit test results are stored.
 * @returns A Promise that resolves to the latest unit test result.
 */
export const getLatestUnitTest = async (testResultsDirectory: string): Promise<{ label: string; data: UnitTestResult }> => {
  const unitTestResultFiles = await fse.readdir(testResultsDirectory);
  unitTestResultFiles.sort((a, b) => a.localeCompare(b));
  const latestUnitTestFile = unitTestResultFiles.pop();
  return {
    label: latestUnitTestFile.split('.')[0],
    data: fse.readJsonSync(path.join(testResultsDirectory, latestUnitTestFile)),
  };
};

/**
 * Prompts the user to select a workflow and returns the selected workflow.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path of the project.
 * @returns {Promise<IAzureQuickPickItem<string>>} - A promise that resolves to the selected workflow.
 */
export const pickWorkflow = async (context: IActionContext, projectPath: string): Promise<IAzureQuickPickItem<string>> => {
  const placeHolder: string = localize('selectLogicApp', 'Select workflow to create unit test');
  return await context.ui.showQuickPick(getWorkflowsPick(projectPath), {
    placeHolder,
  });
};

/**
 * Retrieves the list of workflows in the local project.
 * @param {string} projectPath - The path to the local project.
 * @returns {Promise<IAzureQuickPickItem<string>[]>} - An array of Azure Quick Pick items representing the logic apps in the project.
 */
export const getWorkflowsPick = async (projectPath: string): Promise<IAzureQuickPickItem<string>[]> => {
  const listOfWorkflows = await getWorkflowsInLocalProject(projectPath);
  const picks: IAzureQuickPickItem<string>[] = Array.from(Object.keys(listOfWorkflows)).map((workflowName) => {
    return {
      label: workflowName,
      data: path.join(projectPath, workflowName, workflowFileName),
    };
  });
  picks.sort((a, b) => a.label.localeCompare(b.label));
  return picks;
};

/**
 * Selects a workflow node by prompting the user if none is provided.
 * @param {IAzureConnectorsContext} context - The Azure Connectors context.
 * @param {string} projectPath - Path to the project directory.
 * @returns {Promise<vscode.Uri>} Selected workflow node URI.
 */
export async function selectWorkflowNode(context: IAzureConnectorsContext, projectPath: string): Promise<vscode.Uri> {
  const workflow = await pickWorkflow(context, projectPath);
  return vscode.Uri.file(workflow.data) as vscode.Uri;
}

/**
 * Creates a .csproj file in the specified logic app folder using a template.
 * @param {string} csprojFilePath - The path where the .csproj file will be created.
 * @param {string} logicAppName - The name of the Logic App, used to customize the .csproj file.
 * @returns {Promise<void>} - A promise that resolves when the .csproj file has been created.
 */
export async function createCsprojFile(csprojFilePath: string, logicAppName: string): Promise<void> {
  if (await fse.pathExists(csprojFilePath)) {
    ext.outputChannel.appendLog(localize('csprojFileExists', '.csproj file already exists at: {0}', csprojFilePath));
    return;
  }
  const templateFolderName = 'UnitTestTemplates';
  const csprojTemplateFileName = 'TestProjectFile';
  const templatePath = path.join(__dirname, 'assets', templateFolderName, csprojTemplateFileName);
  const templateContent = await fse.readFile(templatePath, 'utf-8');
  const csprojContent = templateContent.replace(/<%= logicAppName %>/g, logicAppName);
  await fse.writeFile(csprojFilePath, csprojContent);
  ext.outputChannel.appendLog(localize('csprojFileCreated', 'Created .csproj file at: {0}', csprojFilePath));
}

/**
 * Creates a .csproj file in the specified logic app folder using a template.
 * @param {string} csprojFilePath - The path where the .csproj file will be created.
 * @param {string} logicAppName - The name of the Logic App, used to customize the .csproj file.
 * @param {string} workflowName - The name of the workflow.
 * @returns {Promise<void>} - A promise that resolves when the .csproj file has been created.
 */
export async function updateCsprojFile(csprojFilePath: string, workflowName: string): Promise<void> {
  const itemGroupName = 'UnitTestSettingsConfig';
  const contentInclude = path.join(workflowName, '*.config');

  fse.readFile(csprojFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }

    xml2js.parseString(data, { explicitRoot: false }, (err, result) => {
      if (err) {
        console.error('Error parsing XML:', err);
        return;
      }

      let itemGroup = result.ItemGroup?.find((group: any) => group.$?.Label === itemGroupName);

      if (!itemGroup) {
        // Create a new ItemGroup if it doesn't exist
        itemGroup = { $: { Label: itemGroupName }, Content: [] };
        result.ItemGroup = result.ItemGroup || [];
        result.ItemGroup.push(itemGroup);
        console.log(`Created new ItemGroup with label "${itemGroupName}".`);
      }

      const contentExists = itemGroup.Content?.some((content: any) => content.$.Include === contentInclude);

      if (contentExists) {
        console.log(`<Content Include="${contentInclude}" /> already exists in ItemGroup "${itemGroupName}".`);
      } else {
        itemGroup.Content.push({
          $: { Include: contentInclude, Link: path.join(workflowName, '%(RecursiveDir)%(Filename)%(Extension)') },
          CopyToOutputDirectory: 'PreserveNewest',
        });
        console.log(`Added <Content Include="${contentInclude}" Link="${workflowName}\\%(RecursiveDir)%(Filename)%(Extension)">
          <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
          </Content> to ItemGroup "${itemGroupName}".`);

        const builder = new xml2js.Builder();
        const updatedXml = builder.buildObject({ Project: result });

        fse.writeFile(csprojFilePath, updatedXml, 'utf8', (err) => {
          if (err) {
            console.error('Error writing file:', err);
            return;
          }
          console.log('File updated successfully.');
        });
      }
    });
  });
  ext.outputChannel.appendLog(localize('csprojFileUpdated', 'Updated .csproj file at: {0}', csprojFilePath));
}

/**
 * Creates a .cs file in the specified unit test folder using a template.
 * Converts any "-" characters in LogicAppName, WorkflowName, and UnitTestName to "_" only in code-related contexts.
 * @param {string} unitTestFolderPath - The path to the unit test folder.
 * @param {string} unitTestName - The name of the unit test.
 * @param {string} workflowName - The name of the workflow.
 * @param {string} logicAppName - The name of the logic app.
 * @param {string} actionName - The name of the action.
 * @param {string} actionOutputClassName - The name of the action output class.
 * @param {string} actionMockClassName - The name of the action mock class.
 * @param {string} triggerOutputClassName - The name of the trigger output class.
 * @param {string} triggerMockClassName - The name of the trigger mock class.
 */
export async function createCsFile(
  unitTestFolderPath: string,
  unitTestName: string,
  workflowName: string,
  logicAppName: string,
  actionName: string,
  actionOutputClassName: string,
  actionMockClassName: string,
  triggerOutputClassName: string,
  triggerMockClassName: string,
  isBlank = false
): Promise<void> {
  const templateFolderName = 'UnitTestTemplates';

  let csTemplateFileName = '';
  if (actionOutputClassName) {
    // workflow has actions, use templates with action examples
    if (isBlank) {
      csTemplateFileName = 'TestBlankClassFile';
    } else {
      csTemplateFileName = 'TestClassFile';
    }
  } else if (isBlank) {
    // workflow has no actions, use templates with trigger examples
    csTemplateFileName = 'TestBlankClassFileWithoutActions';
  } else {
    csTemplateFileName = 'TestClassFileWithoutActions';
  }

  const templatePath = path.join(__dirname, 'assets', templateFolderName, csTemplateFileName);

  let templateContent = await fse.readFile(templatePath, 'utf-8');

  const sanitizedUnitTestName = unitTestName.replace(/-/g, '_');
  const sanitizedWorkflowName = workflowName.replace(/-/g, '_');
  const sanitizedLogicAppName = logicAppName.replace(/-/g, '_');

  templateContent = templateContent.replace(/namespace <%= LogicAppName %>\.Tests/g, `namespace ${sanitizedLogicAppName}.Tests`);
  templateContent = templateContent.replace(/public class <%= UnitTestName %>/g, `public class ${sanitizedUnitTestName}`);
  templateContent = templateContent.replace(/<see cref="<%= UnitTestName %>" \/>/g, `<see cref="${sanitizedUnitTestName}" />`);
  templateContent = templateContent.replace(/public <%= UnitTestName %>\(\)/g, `public ${sanitizedUnitTestName}()`);
  templateContent = templateContent.replace(
    /public async Task <%= WorkflowName %>_<%= UnitTestName %>_ExecuteWorkflow/g,
    `public async Task ${sanitizedWorkflowName}_${sanitizedUnitTestName}_ExecuteWorkflow`
  );

  templateContent = templateContent
    .replace(/<%= LogicAppName %>/g, logicAppName)
    .replace(/<%= WorkflowName %>/g, workflowName)
    .replace(/<%= UnitTestName %>/g, unitTestName)
    .replace(/<%= SanitizedWorkflowName %>/g, sanitizedWorkflowName)
    .replace(/<%= ActionMockName %>/g, actionName)
    .replace(/<%= ActionMockOutputClassName %>/g, actionOutputClassName)
    .replace(/<%= ActionMockClassName %>/g, actionMockClassName)
    .replace(/<%= TriggerMockOutputClassName %>/g, triggerOutputClassName)
    .replace(/<%= TriggerMockClassName %>/g, triggerMockClassName)
    .replace(/<%= UnitTestSubFolder %>/g, unitTestName)
    .replace(/<%= UnitTestMockJson %>/g, `${unitTestName}-mock.json`);

  const csFilePath = path.join(unitTestFolderPath, `${unitTestName}.cs`);
  await fse.writeFile(csFilePath, templateContent);

  ext.outputChannel.appendLog(localize('csFileCreated', 'Created .cs file at: {0}', csFilePath));
}

/**
 * Creates a testSettings.config file in the specified unit test folder using a template.
 * Converts any "-" characters in LogicAppName, WorkflowName, and UnitTestName to "_" only in code-related contexts.
 * @param {string} logicAppTestFolderPath - The path to the logicapp folder within Tests.
 * @param {string} logicAppName - The name of the logic app.
 */
export async function createTestExecutorFile(logicAppTestFolderPath: string, logicAppName: string): Promise<void> {
  const templateFolderName = 'UnitTestTemplates';
  const executorTemplateFileName = 'TestExecutorFile';
  const templatePath = path.join(__dirname, 'assets', templateFolderName, executorTemplateFileName);

  const csFilePath = path.join(logicAppTestFolderPath, 'TestExecutor.cs');

  if (await fse.pathExists(csFilePath)) {
    ext.outputChannel.appendLog(localize('testExecutorFileExists', 'TestExecutor.cs file already exists at: {0}', csFilePath));
    return;
  }

  let templateContent = await fse.readFile(templatePath, 'utf-8');
  templateContent = templateContent.replace(/<%= LogicAppName %>/g, logicAppName);

  await fse.writeFile(csFilePath, templateContent);
  ext.outputChannel.appendLog(localize('createdTestExecutorFile', 'Created TestExecutor.cs file at: {0}', csFilePath));
}

/**
 * Creates a testSettings.config file in the specified unit test folder using a template.
 * Converts any "-" characters in LogicAppName, WorkflowName, and UnitTestName to "_" only in code-related contexts.
 * @param {string} unitTestFolderPath - The path to the unit test folder.
 * @param {string} workflowName - The name of the workflow.
 * @param {string} logicAppName - The name of the logic app.
 */
export async function createTestSettingsConfigFile(unitTestFolderPath: string, workflowName: string, logicAppName: string): Promise<void> {
  const templateFolderName = 'UnitTestTemplates';
  const configTemplateFileName = 'TestSettingsConfigFile';
  const templatePath = path.join(__dirname, 'assets', templateFolderName, configTemplateFileName);
  const csFilePath = path.join(unitTestFolderPath, 'testSettings.config');

  if (await fse.pathExists(csFilePath)) {
    ext.outputChannel.appendLog(localize('testSettingsConfigFileExists', 'testSettings.config file already exists at: {0}', csFilePath));
    return;
  }

  let templateContent = await fse.readFile(templatePath, 'utf-8');
  templateContent = templateContent
    .replace(/%WorkspacePath%/g, '../../../../')
    .replace(/%LogicAppName%/g, logicAppName)
    .replace(/%WorkflowName%/g, workflowName);

  await fse.writeFile(csFilePath, templateContent);
  ext.outputChannel.appendLog(localize('createdTestSettingsConfig', 'Created testSettings.config file at: {0}', csFilePath));
}

/**
 * Validates and extracts the runId from a given input.
 * Ensures the runId format is correct and extracts it from a path if needed.
 * @param {string | undefined} runId - The input runId to validate and extract.
 * @returns {Promise<string>} - A Promise that resolves to the validated and extracted runId.
 */
export async function extractAndValidateRunId(runId?: string): Promise<string> {
  if (!runId) {
    throw new Error(localize('runIdMissing', 'Run ID is required to generate a codeful unit test.'));
  }

  // Regular expression to extract the runId from a path
  const runIdRegex = /\/workflows\/[^/]+\/runs\/(.+)$/;
  const match = runId.match(runIdRegex);
  const extractedRunId = match ? match[1].trim() : runId.trim();

  // Validate the extracted runId
  await validateRunId(extractedRunId);
  return extractedRunId;
}

/**
 * Validates the format of the runId.
 * Ensures that the runId consists of only uppercase letters and numbers.
 * @param {string} runId - The runId to validate.
 * @throws {Error} - Throws an error if the runId format is invalid.
 */
export async function validateRunId(runId: string): Promise<void> {
  const runIdFormat = /^[A-Z0-9]+$/;
  if (!runIdFormat.test(runId)) {
    throw new Error(localize('invalidRunIdFormat', 'Invalid runId format.'));
  }
}

/**
 * Logs messages and telemetry for successful operations.
 * @param {IActionContext} context - The action context.
 * @param {string} property - The property name for telemetry.
 * @param {string} message - The message to log.
 */
export function logSuccess(context: IActionContext, property: string, message: string): void {
  context.telemetry.properties[property] = 'Success';
  ext.outputChannel.appendLog(message);
}

/**
 * Logs errors and telemetry for failed operations.
 * @param {IActionContext} context - The action context.
 * @param {Error} error - The error to log.
 * @param {string} property - The property name for telemetry.
 * @returns {void}
 */
export function logError(context: IActionContext, error: Error, property: string): void {
  context.telemetry.properties[property] = 'Failed';
  const errorMessage = error.message || localize('unknownError', 'An unknown error occurred.');
  ext.outputChannel.appendLog(errorMessage);
  vscode.window.showErrorMessage(errorMessage);
}

/**
 * Returns standardized paths for unit test generation.
 * The structure is the same as originally used in generateBlankCodefulUnitTest.
 *
 * @param {string} projectPath - The base project path.
 * @param {string} workflowName - The workflow name.
 * @param {string | undefined} unitTestName - The unit test name, if any.
 * @returns An object containing testsDirectory, logicAppName, logicAppTestFolderPath, workflowTestFolderPath, and optionally unitTestFolderPath.
 */
export function getUnitTestPaths(
  projectPath: string,
  workflowName: string,
  unitTestName?: string
): {
  testsDirectory: string;
  logicAppName: string;
  logicAppTestFolderPath: string;
  workflowTestFolderPath: string;
  unitTestFolderPath?: string;
} {
  const testsDirectoryUri = getTestsDirectory(projectPath);
  const testsDirectory = testsDirectoryUri.fsPath;
  const logicAppName = path.basename(path.dirname(path.join(projectPath, workflowName)));
  const logicAppTestFolderPath = path.join(testsDirectory, logicAppName);
  const workflowTestFolderPath = path.join(logicAppTestFolderPath, workflowName);
  const paths = {
    testsDirectory,
    logicAppName,
    logicAppTestFolderPath,
    workflowTestFolderPath,
  };
  if (unitTestName) {
    paths['unitTestFolderPath'] = path.join(workflowTestFolderPath, unitTestName);
  }
  return paths;
}

/**
 * Prompts the user for a unit test name with validation.
 * @param {IAzureConnectorsContext} context - The Azure Connectors context.
 * @param {string} projectPath - Path to the project directory.
 * @param {string} workflowName - Name of the workflow.
 * @returns {Promise<string>} The validated unit test name.
 */
export async function promptForUnitTestName(context: IAzureConnectorsContext, projectPath: string, workflowName: string): Promise<string> {
  return context.ui.showInputBox({
    prompt: localize('unitTestNamePrompt', 'Provide a unit test name'),
    placeHolder: localize('unitTestNamePlaceholder', 'Unit test name'),
    validateInput: (name: string) => validateUnitTestName(projectPath, workflowName, name),
  });
}

/**
 * Logs telemetry properties for unit test creation.
 * @param {IAzureConnectorsContext} context - The Azure Connectors context.
 * @param {Record<string, string | undefined>} properties - Telemetry properties.
 */
export function logTelemetry(context: IAzureConnectorsContext, properties: Record<string, string | undefined>): void {
  Object.assign(context.telemetry.properties, properties);
}

/**
 * Handles errors by logging them and displaying user-facing messages.
 * @param {IAzureConnectorsContext} context - The Azure Connectors context.
 * @param {unknown} error - The error object.
 * @param {string} source - The source of the error.
 */
export function handleError(context: IAzureConnectorsContext, error: unknown, source: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  context.telemetry.properties[`${source}Error`] = errorMessage;
  vscode.window.showErrorMessage(localize(`${source}Error`, 'An error occurred: {0}', errorMessage));
  ext.outputChannel.appendLog(localize(`${source}Log`, 'Error in {0}: {1}', source, errorMessage));
}

/**
 * Ensures the .csproj and NuGet configuration files exist.
 * @param {string} logicAppTestFolderPath - Path to the project directory.
 * @param {string} logicAppName - Name of the workflow.
 * @param {string} testsDirectory - Name of the workflow.
 */
export async function ensureCsproj(testsDirectory: string, logicAppTestFolderPath: string, logicAppName: string): Promise<void> {
  const csprojFilePath = path.join(logicAppTestFolderPath, `${logicAppName}.csproj`);

  if (!(await fse.pathExists(csprojFilePath))) {
    ext.outputChannel.appendLog(localize('creatingCsproj', 'Creating .csproj file at: {0}', csprojFilePath));
    await createCsprojFile(csprojFilePath, logicAppName);
    const action = 'Reload Window';
    vscode.window
      .showInformationMessage('Reload Required: Please reload the VS Code window to enable test discovery in the Test Explorer', action)
      .then((selectedAction) => {
        if (selectedAction === action) {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
  }
}

/**
 * Removes invalid characters (e.g., (), -, etc.) from a string.
 * @param {string} str - The input string.
 * @returns {string} - The cleaned string with invalid characters removed.
 */
export function removeInvalidCharacters(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Parses an error (particularly from Axios) before setting a final errorMessage.
 * @param error - The error to parse.
 * @returns {string} - A user-friendly error string.
 */
export function parseErrorBeforeTelemetry(error: any): string {
  let errorMessage = '';

  // eslint-disable-next-line import/no-named-as-default-member
  if (axios.isAxiosError(error) && error.response?.data) {
    try {
      const responseData = JSON.parse(new TextDecoder().decode(error.response.data));
      const { message = '', code = '' } = responseData?.error ?? {};
      errorMessage = localize('apiError', `API Error: ${code} - ${message}`);
      ext.outputChannel.appendLog(errorMessage);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (parseError) {
      // If we fail to parse, fall back to the original error
      errorMessage = error.message;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    // Fallback for non-Error types
    errorMessage = String(error);
  }
  return errorMessage;
}

/**
 * Parses and transforms raw output parameters from a unit test definition into a structured format.
 * @param unitTestDefinition - The unit test definition object.
 * @returns A Promise resolving to an object containing operationInfo and outputParameters.
 */
export async function parseUnitTestOutputs(unitTestDefinition: any): Promise<{
  operationInfo: any;
  outputParameters: Record<string, any>;
}> {
  const allowedFields = ['type', 'title', 'format', 'description'];

  const transformRawOutputs = (rawOutput: any): Record<string, any> => {
    const transformedOutput: Record<string, any> = {};
    for (const rawKey in rawOutput) {
      if (Object.prototype.hasOwnProperty.call(rawOutput, rawKey)) {
        const cleanedKey = rawKey.replace('outputs.$.', '').replace('.$.', '.').replace('$.', '').replace('.$', '');
        const keyParts = cleanedKey.split('.');
        keyParts.reduce((nestedObject, part, index) => {
          if (index === keyParts.length - 1) {
            if (
              Object.prototype.hasOwnProperty.call(nestedObject, part) &&
              typeof nestedObject[part] === 'object' &&
              typeof rawOutput[rawKey] === 'object'
            ) {
              nestedObject[part] = {
                ...nestedObject[part],
                ...Object.keys(rawOutput[rawKey]).reduce((filteredFields, fieldKey) => {
                  if (allowedFields.includes(fieldKey)) {
                    const newFieldKey = fieldKey === 'type' ? 'nestedTypeProperty' : fieldKey;
                    (filteredFields as Record<string, any>)[newFieldKey] = rawOutput[rawKey][fieldKey];
                  }
                  return filteredFields;
                }, {}),
              };
            } else {
              nestedObject[part] = Object.keys(rawOutput[rawKey]).reduce((filteredFields, fieldKey) => {
                if (allowedFields.includes(fieldKey)) {
                  const newFieldKey = fieldKey === 'type' ? 'nestedTypeProperty' : fieldKey;
                  (filteredFields as Record<string, any>)[newFieldKey] = rawOutput[rawKey][fieldKey];
                }
                return filteredFields;
              }, {});
            }
          } else {
            nestedObject[part] = nestedObject[part] || {};
          }
          return nestedObject[part];
        }, transformedOutput);
      }
    }
    return transformedOutput;
  };

  const parsedOutputs: { operationInfo: any; outputParameters: any } = {
    operationInfo: unitTestDefinition['operationInfo'],
    outputParameters: {},
  };

  for (const parameterKey in unitTestDefinition['outputParameters']) {
    parsedOutputs.outputParameters[parameterKey] = {
      outputs: transformRawOutputs(unitTestDefinition['outputParameters'][parameterKey].outputs),
    };
  }
  return parsedOutputs;
}

/**
 * Represents the metadata for generating a single C# class.
 * Will store the class name, a doc-comment, properties, and child class definitions.
 */
export interface ClassDefinition {
  className: string;
  description: string | null; // If there's a description at the object level
  inheritsFrom?: string;
  properties: PropertyDefinition[]; // The list of properties in this class
  children: ClassDefinition[]; // Nested child classes (for sub-objects)
}

/**
 * Represents a single property on a C# class, including type and doc-comment.
 */
export interface PropertyDefinition {
  propertyName: string; // e.g. "Id", "Name", "Body", etc.
  propertyType: string; // e.g. "string", "int", "Body" (another class), etc.
  description: string | null;
  isObject: boolean; // If true, the propertyType is a nested class name
  jsonPropertyName: string | null;
}

/**
 * Recursively traverses the JSON structure ("outputs") to build a ClassDefinition tree.
 *
 * @param {string} className - The name for this class in C# (PascalCase).
 * @param {any}    node      - The node in the JSON structure containing .type, .description, and subfields.
 * @returns {ClassDefinition} - A class definition describing the current node and its children.
 */
export function buildClassDefinition(className: string, node: any): ClassDefinition {
  // If there's a top-level "description" for the object
  let classDescription: string | null = node.description ? String(node.description) : null;
  if (!classDescription) {
    if (node.nestedTypeProperty === 'object') {
      const skipKeys = ['nestedTypeProperty', 'title', 'description', 'format', 'headers', 'queries', 'tags', 'relativePathParameters'];
      const propertyNames = Object.keys(node).filter((key) => !skipKeys.includes(key));
      classDescription =
        propertyNames.length > 0
          ? `Class for ${className} representing an object with properties.`
          : `Class for ${className} representing an empty object.`;
    } else {
      classDescription = `Class for ${className} representing a ${node.nestedTypeProperty} value.`;
    }
  }

  // We'll collect property info for the current class
  const properties: PropertyDefinition[] = [];

  // We'll collect child classes if we see nested objects (type: "object").
  const children: ClassDefinition[] = [];

  // If this node is an object, it may have sub-fields we need to parse as properties.
  if (node.nestedTypeProperty === 'object') {
    // Create a combined array of keys we need to skip
    const skipKeys = ['nestedTypeProperty', 'title', 'description', 'format', 'headers', 'queries', 'tags', 'relativePathParameters'];

    // For each subfield in node (like "id", "location", "properties", etc.)
    for (const key of Object.keys(node)) {
      // Skip known metadata fields and the newly added keys (headers, queries, relativePathParameters)
      if (skipKeys.includes(key)) {
        continue;
      }

      const subNode = node[key];
      let propName = toPascalCase(key);

      // Handle special characters
      let jsonPropertyName = null;
      if (/[~@]/.test(key)) {
        jsonPropertyName = key.replace(/~1/g, '.');
        propName = toPascalCase(subNode?.title.replace(/[^a-zA-Z0-9]/g, ''));
      }

      // Determine the child's C# type
      let csharpType = mapJsonTypeToCSharp(subNode?.nestedTypeProperty, subNode?.format);
      let isObject = false;

      // If it's an object, we must generate a nested class.
      // We'll do that recursively, then use the generated child's className for this property type.
      if (subNode?.nestedTypeProperty === 'object') {
        isObject = true;
        const childClassName = className + propName; // e.g. "ActionOutputs" -> "ActionOutputsBody"
        const childDef = buildClassDefinition(childClassName, subNode);

        // If there are child properties then use the newly created object, otherwise use JObject
        if (childDef.properties.length > 0) {
          children.push(childDef);
          // The property for this sub-node points to the newly created child's class name
          csharpType = childDef.className;
        }
      }

      // If it's an array, process the array items
      if (subNode?.nestedTypeProperty === 'array') {
        isObject = true;
        const arrayItemNode = subNode['[*]'];
        const arrayItemClassName = subNode?.description ? toPascalCase(subNode?.description.replace(/\s+/g, '')) : ''; // Remove spaces from description
        const arrayItemDef = buildClassDefinition(arrayItemClassName, arrayItemNode);

        // If there are child properties then use the newly created object, otherwise use JObject
        if (arrayItemDef.properties.length > 0) {
          children.push(arrayItemDef);
          // The property for this sub-node points to the newly created child's class name
          csharpType = `List<${arrayItemDef.className}>`;
        }
      }
      // If it's an array, you might want to look at subNode.items.type to refine the list item type.
      // Check if the subNode has a "description" to be used as a doc-comment on the property.
      const subDescription = subNode?.description ? String(subNode.description) : null;
      properties.push({
        propertyName: propName,
        propertyType: csharpType,
        description: subDescription,
        isObject,
        jsonPropertyName,
      });
    }
  }
  // Build the ClassDefinition for the current node
  return {
    className,
    description: classDescription,
    properties,
    children,
  };
}

/**
 * Maps JSON types to corresponding C# types.
 */
export function mapJsonTypeToCSharp(jsonType: string, jsonFormat?: string): string {
  switch (jsonType) {
    case 'string':
      return jsonFormat === 'date-time' ? 'DateTime' : 'string';
    case 'integer':
      return 'int';
    case 'number':
      return 'double';
    case 'boolean':
      return 'bool';
    case 'array':
      return 'List<object>';
    case 'object':
      return 'JObject';
    case 'any':
      return 'JObject';
    case 'date-time':
      return 'DateTime';
    default:
      return 'JObject';
  }
}

export function generateTriggerActionMockClass(mockType: string, mockClassName: string, className: string) {
  const sb: string[] = [];
  sb.push('    /// <summary>');
  sb.push(`    /// The <see cref="${mockClassName}"/> class.`);
  sb.push('    /// </summary>');
  sb.push(`    public class ${mockClassName} : ${mockType}`);
  sb.push('    {');
  sb.push('        /// <summary>');
  sb.push(`        /// Creates a mocked instance for  <see cref="${mockClassName}"/> with static outputs.`);
  sb.push('        /// </summary>');
  sb.push(
    `        public ${mockClassName}(TestWorkflowStatus status = TestWorkflowStatus.Succeeded, string name = null, ${className} outputs = null)`
  );
  sb.push(`            : base(status: status, name: name, outputs: outputs ?? new ${className}())`);
  sb.push('        {');
  sb.push('        }');
  sb.push('');
  sb.push('        /// <summary>');
  sb.push(`        /// Creates a mocked instance for  <see cref="${mockClassName}"/> with static error info.`);
  sb.push('        /// </summary>');
  sb.push(`        public ${mockClassName}(TestWorkflowStatus status, string name = null, TestErrorInfo error = null)`);
  sb.push('            : base(status: status, name: name, error: error)');
  sb.push('        {');
  sb.push('        }');
  sb.push('');
  sb.push('        /// <summary>');
  sb.push(`        /// Creates a mocked instance for <see cref="${mockClassName}"/> with a callback function for dynamic outputs.`);
  sb.push('        /// </summary>');
  sb.push(`        public ${mockClassName}(Func<TestExecutionContext, ${mockClassName}> onGet${mockType}, string name = null)`);
  sb.push(`            : base(onGet${mockType}: onGet${mockType}, name: name)`);
  sb.push('        {');
  sb.push('        }');
  sb.push('    }');
  sb.push('');
  return sb.join('\n');
}

/**
 * Recursively builds a single C# class string from a ClassDefinition and any child classes it might have.
 * @param {ClassDefinition} classDef - The definition of the class to generate.
 * @returns {string} - The C# code for this class (including any nested classes), as a string.
 */
export function generateClassCode(classDef: ClassDefinition): string {
  const sb: string[] = [];

  if (classDef.description) {
    sb.push('    /// <summary>');
    sb.push(`    /// ${classDef.description}`);
    sb.push('    /// </summary>');
  }

  sb.push(`    public class ${classDef.className}${classDef.inheritsFrom ? ` : ${classDef.inheritsFrom}` : ''}`);
  sb.push('    {');

  for (const prop of classDef.properties) {
    if (prop.description) {
      sb.push('        /// <summary>');
      sb.push(`        /// ${prop.description}`);
      sb.push('        /// </summary>');
    }
    if (prop.jsonPropertyName) {
      sb.push(`        [JsonProperty(PropertyName="${prop.jsonPropertyName}")]`);
    }
    sb.push(`        public ${prop.propertyType} ${prop.propertyName} { get; set; }`);
    sb.push('');
  }

  sb.push('        /// <summary>');
  sb.push(`        /// Initializes a new instance of the <see cref="${classDef.className}"/> class.`);
  sb.push('        /// </summary>');
  sb.push(`        public ${classDef.className}()`);
  sb.push('        {');
  sb.push('            this.StatusCode = HttpStatusCode.OK;');

  for (const prop of classDef.properties) {
    if (prop.propertyType === 'string') {
      sb.push(`            this.${prop.propertyName} = string.Empty;`);
    } else if (prop.propertyType === 'DateTime') {
      sb.push(`            this.${prop.propertyName} = new DateTime();`);
    } else if (prop.isObject) {
      sb.push(`            this.${prop.propertyName} = new ${prop.propertyType}();`);
    } else if (prop.propertyType === 'JObject') {
      sb.push(`            this.${prop.propertyName} = new JObject();`);
    } else if (prop.propertyType.startsWith('List<')) {
      sb.push(`            this.${prop.propertyName} = new ${prop.propertyType}();`);
    } else if (prop.propertyType === 'int') {
      sb.push(`            this.${prop.propertyName} = 0;`);
    } else if (prop.propertyType === 'HttpStatusCode') {
      sb.push(`            this.${prop.propertyName} = HttpStatusCode.OK;`);
    }
  }

  sb.push('        }');
  sb.push('');
  sb.push('    }');
  sb.push('');

  for (const child of classDef.children) {
    sb.push(generateClassCode(child));
  }

  return sb.join('\n');
}

/**
 * Filters mockable operations, transforms their output parameters,
 * and writes C# class definitions to .cs files.
 * @param operationInfo - The operation info object.
 * @param outputParameters - The output parameters object.
 * @param workflowTestFolderPath - The path to the workflow folder where the .cs files will be saved.
 * @param workflowName - The name of the workflow.
 * @param logicAppName - The name of the Logic App to use as the namespace.
 */
export async function processAndWriteMockableOperations(
  operationInfo: any,
  outputParameters: any,
  workflowPath: string,
  workflowTestFolderPath: string,
  workflowName: string,
  logicAppName: string
): Promise<{ foundActionMocks: Record<string, string>; foundTriggerMocks: Record<string, string> }> {
  // Keep track of all operation IDs we've processed to avoid duplicates
  const processedOperationIds = new Set<string>();

  // Create or verify the "MockOutputs" folder inside the logicApp folder
  const mockOutputsFolderPath = path.join(workflowTestFolderPath, 'MockOutputs');
  await fse.ensureDir(mockOutputsFolderPath);

  // Dictionaries to store mockable operation names and their corresponding class names
  const foundActionMocks: Record<string, string> = {};
  const foundTriggerMocks: Record<string, string> = {};

  const workflowContent = JSON.parse(await fse.readFile(workflowPath, 'utf8'));
  const triggerName = Object.keys(workflowContent?.definition?.triggers)?.[0] ?? null;

  for (const operationName in operationInfo) {
    const operation = operationInfo[operationName];
    const type = operation.type;

    // Edge cases where operationId might be absent
    const operationId = operation.operationId ?? operationName;

    // If we've already processed this operation ID, skip to the next
    if (processedOperationIds.has(operationId)) {
      continue;
    }
    processedOperationIds.add(operationId);

    const isTrigger = operationName === triggerName;

    // Only proceed if this operation type is mockable (using the new async isMockable)
    if (await isMockable(type)) {
      // Set operationName as className
      const cleanedOperationName = removeInvalidCharacters(operationName);
      let className = toPascalCase(cleanedOperationName);
      let mockClassName = toPascalCase(cleanedOperationName);

      // Append suffix based on whether it's a trigger
      className += isTrigger ? 'TriggerOutput' : 'ActionOutput';

      const mockType = isTrigger ? 'TriggerMock' : 'ActionMock';
      mockClassName += isTrigger ? 'TriggerMock' : 'ActionMock';

      // Transform the output parameters for this operation
      const outputs = outputParameters[operationName]?.outputs;

      // Sanitize logic app name for namespace (replace '-' with '_')
      const sanitizedLogicAppName = logicAppName.replace(/-/g, '_');

      // Generate C# class content
      const classContent = generateCSharpClasses(sanitizedLogicAppName, className, workflowName, mockType, mockClassName, outputs);

      // Write the .cs file
      const filePath = path.join(mockOutputsFolderPath, `${className}.cs`);
      await fse.writeFile(filePath, classContent, 'utf-8');

      // Log to output channel
      ext.outputChannel.appendLog(localize('csFileCreated', 'Created .cs file at: {0}', filePath));
      // Store the operation name and class name in the appropriate dictionary
      if (isTrigger) {
        foundTriggerMocks[operationName] = className;
      } else {
        foundActionMocks[operationName] = className;
      }
    }
  }
  return { foundActionMocks, foundTriggerMocks };
}

/**
 * Generates a C# class definition as a string.
 * @param {string} logicAppName - The name of the Logic App, used as the namespace.
 * @param {string} className - The name of the class to generate.
 * @param {string} workflowName - The workflow name the class belongs to.
 * @param {string} mockType - The mockType of the class to generate.
 * @param {string} mockClassName - The mockType of the class to generate.
 * @param {any} outputs - The outputs object containing properties to include in the class.
 * @returns {string} - The generated C# class definition.
 */
export function generateCSharpClasses(
  namespaceName: string,
  rootClassName: string,
  workflowName: string,
  mockType: string,
  mockClassName: string,
  data: any
): string {
  // Build a root class definition (the entire data is assumed to be an object).
  // If data isn't type "object", you might want special handling, but typically
  // transformParameters() yields an object at the top level.

  const rootDef = buildClassDefinition(rootClassName, {
    nestedTypeProperty: 'object',
    ...data, // Merge the data (including "description", subfields, etc.)
  });

  rootDef.inheritsFrom = 'MockOutput';

  const sanitizedWorkflowName = workflowName.replace(/-/g, '_');

  const adjustedNamespace = `${namespaceName}.Tests.Mocks.${sanitizedWorkflowName}`;

  const actionTriggerMockClassCode = generateTriggerActionMockClass(mockType, mockClassName, rootClassName);
  // Generate the code for the root class (this also recursively generates nested classes).
  const requiredNamespaces = [
    'Microsoft.Azure.Workflows.UnitTesting.Definitions',
    'Microsoft.Azure.Workflows.UnitTesting.ErrorResponses',
    'Newtonsoft.Json',
    'Newtonsoft.Json.Linq',
    'System.Collections.Generic',
    'System.Net',
    'System',
  ];
  const classCode = generateClassCode(rootDef);
  // wrap it all in the needed "using" statements + namespace.
  return [
    ...requiredNamespaces.map((ns) => `using ${ns};`),
    '',
    `namespace ${adjustedNamespace}`,
    '{',
    actionTriggerMockClassCode,
    classCode,
    '}',
  ].join('\n');
}

// Static sets for mockable operation types
const mockableActionTypes = new Set<string>(['Http', 'InvokeFunction', 'Function', 'ServiceProvider', 'ApiManagement', 'ApiConnection']);

const mockableTriggerTypes = new Set<string>(['HTTPWEBHOOK', 'REQUEST', 'MANUAL', 'APICONNECTIONWEBHOOK']);

// This set will be populated from the runtime API
const mockableOperationTypes = new Set<string>();

/**
 * Retrieves the mockable operation types from the runtime API and populates the set.
 * Throws an error if the design time port is undefined or if the request fails.
 */
export async function getMockableOperationTypes(): Promise<void> {
  if (!ext.designTimePort) {
    throw new Error(
      localize('errorStandardResourcesApi', 'Design time port is undefined. Please retry once Azure Functions Core Tools has started.')
    );
  }
  const baseUrl = `http://localhost:${ext.designTimePort}`;
  const listMockableOperationsUrl = `${baseUrl}/runtime/webhooks/workflow/api/management/listMockableOperations`;
  ext.outputChannel.appendLog(localize('listMockableOperations', `Fetching unit test mockable operations at ${listMockableOperationsUrl}`));
  try {
    const response = await axios.get(listMockableOperationsUrl);
    response.data.forEach((mockableOperation: string) => mockableOperationTypes.add(mockableOperation.toUpperCase()));
  } catch (apiError: any) {
    if (axios.isAxiosError(apiError)) {
      ext.outputChannel.appendLog(
        localize(
          'errorListMockableOperationsFailed',
          `Request to ${listMockableOperationsUrl} failed with status: {0}, message: {1}, response: {2}`,
          apiError.response?.status,
          apiError.response?.statusText,
          JSON.stringify(apiError.response?.data || {})
        )
      );
    }
    throw apiError;
  }
}

/**
 * Determines if a given operation type can be mocked.
 * This asynchronous function first ensures that runtime mockable operations are fetched,
 * then checks if the provided type exists (in a case-insensitive manner) in the runtime set,
 * or in the static action/trigger sets.
 * @param type - The operation type.
 * @returns A Promise that resolves to true if the operation is mockable, false otherwise.
 */
export async function isMockable(type: string): Promise<boolean> {
  if (mockableOperationTypes.size === 0) {
    await getMockableOperationTypes();
  }
  const normalizedType = type.toUpperCase();

  // First, check if the runtime API indicates this type is mockable
  if (mockableOperationTypes.has(normalizedType)) {
    return true;
  }
  // Otherwise, check the static sets (action and trigger types)
  if (Array.from(mockableActionTypes).some((t) => t.toUpperCase() === normalizedType)) {
    return true;
  }
  if (Array.from(mockableTriggerTypes).some((t) => t.toUpperCase() === normalizedType)) {
    return true;
  }
  return false;
}
