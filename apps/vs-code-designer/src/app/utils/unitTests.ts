/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { saveUnitTestEvent, testsDirectoryName, unitTestsFileName } from '../../constants';
import { localize } from '../../localize';
import { type IAzureQuickPickItem, type IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

export interface UnitTestResult {
  isSuccessful: boolean;
  assertions: any[];
  duration?: number;
}

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

      if (!fs.existsSync(workflowTestsPath)) {
        fs.mkdirSync(workflowTestsPath, { recursive: true });
      }
      try {
        fs.writeFileSync(unitTestsPath, JSON.stringify(unitTestDefinition, null, 4));
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
const getTestsDirectory = (projectPath: string) => {
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
