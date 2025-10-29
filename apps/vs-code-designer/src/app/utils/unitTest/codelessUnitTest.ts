/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { callWithTelemetryAndErrorHandling, type IAzureQuickPickItem, type IActionContext } from '@microsoft/vscode-azext-utils';
import { saveUnitTestEvent, unitTestsFileName } from '../../../constants';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { localize } from '../../../localize';
import type { UnitTestResult } from '@microsoft/vscode-extension-logic-apps/src/lib/models/unitTest';
import { getTestsDirectory } from './unitTest';

/**
 * Retrieves the name of the unit test from the given file path.
 * @param {string} filePath - The path of the unit test file.
 * @returns The name of the unit test.
 */
export const getUnitTestName = (filePath: string): string => {
  const unitTestFileName = path.basename(filePath);
  const fileNameItems = unitTestFileName.split('.');
  return fileNameItems[0];
};

/**
 * Saves a unit test definition for a workflow to the file system.
 *
 * Creates the necessary directory structure and writes the unit test definition as a JSON file.
 * Displays a progress notification while saving and handles errors with user-friendly messages.
 *
 * @param context - The action context for telemetry and error handling
 * @param projectPath - The absolute path to the project directory
 * @param workflowName - The name of the workflow being tested
 * @param unitTestName - The name of the unit test
 * @param unitTestDefinition - The unit test definition object to be saved as JSON
 * @returns A promise that resolves when the unit test is successfully saved
 * @throws Will throw an error if the file cannot be written to the file system
 */
export const saveUnitTestDefinition = async (
  context: IActionContext,
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
      const unitTestsPath = path.join(projectPath, projectName, workflowName, `${unitTestName}${unitTestsFileName}`);
      const workflowTestsPath = path.join(testsDirectory.fsPath, projectName, workflowName);

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
        const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
        const localizedError = localize('saveFailureUnitTest', 'Unit Test Definition not saved. ') + errorMessage;
        context.telemetry.properties.saveUnitTestError = localizedError;
        vscode.window.showErrorMessage(`${localizedError}`, localize('OK', 'OK'));
        throw error;
      }
    });
  });
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
 * Prompts the user to select a unit test to edit.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path of the project.
 * @returns A promise that resolves to the selected unit test.
 */
export const pickUnitTestNode = async (context: IActionContext, projectPath: string): Promise<vscode.Uri> => {
  const placeHolder: string = localize('selectUnitTest', 'Select unit test to edit');
  const unitTest = (await context.ui.showQuickPick(getUnitTestPicks(projectPath), { placeHolder })).data;
  return vscode.Uri.file(unitTest);
};

/**
 * Retrieves a list of unit tests in the local project.
 * @param {string} projectPath - The path to the project.
 * @returns A promise that resolves to an array of unit test picks.
 */
const getUnitTestPicks = async (projectPath: string): Promise<IAzureQuickPickItem<string>[]> => {
  const listOfUnitTest = await getUnitTestInLocalProject(projectPath);
  const picks: IAzureQuickPickItem<string>[] = Array.from(Object.keys(listOfUnitTest)).map((unitTestName) => {
    return { label: unitTestName, data: listOfUnitTest[unitTestName] };
  });

  picks.sort((a, b) => a.label.localeCompare(b.label));
  return picks;
};

/**
 * Retrieves the list of unit tests in a local project.
 * @param {string} projectPath - The path to the project.
 * @returns A promise that resolves to a record of unit test names and their corresponding file paths.
 */
async function getUnitTestInLocalProject(projectPath: string): Promise<Record<string, string>> {
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
          const unitTestFileNameWithoutExtension = path.basename(fullPath).replace(unitTestsFileName, '');
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
 * Picks a unit test result from the provided test results directory.
 * @param {IActionContext} context - The action context.
 * @param {string} testResultsDirectory - The directory containing the unit test results.
 * @returns A promise that resolves to the selected unit test result.
 */
export const pickUnitTestResult = async (context: IActionContext, testResultsDirectory: string): Promise<UnitTestResult> => {
  const placeHolder: string = localize('selectUnitTest', 'Select unit result');
  return (await context.ui.showQuickPick(getUnitTestResultPicks(testResultsDirectory), { placeHolder })).data;
};

/**
 * Retrieves the unit test result pick from the specified test results directory.
 * @param {string} testResultsDirectory The directory where the unit test results are stored.
 * @returns A promise that resolves to an array of `IAzureQuickPickItem<UnitTestResult>`.
 */
const getUnitTestResultPicks = async (testResultsDirectory: string): Promise<IAzureQuickPickItem<UnitTestResult>[]> => {
  const listOfUnitTestResults = await fse.readdir(testResultsDirectory);
  const list = listOfUnitTestResults.map((unitTestResult) => {
    return { label: unitTestResult.split('.')[0], data: fse.readJsonSync(path.join(testResultsDirectory, unitTestResult)) };
  });
  list.sort((a, b) => a.label.localeCompare(b.label));
  return list;
};
