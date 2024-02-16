/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { developmentDirectoryName, saveUnitTestEvent, testsDirectoryName, unitTestsFileName } from '../../constants';
import { localize } from '../../localize';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

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
      const unitTestsPath = getUnitTestsPath(projectPath, workflowName, unitTestName);
      const workflowTestsPath = getWorkflowTestsPath(projectPath, workflowName);

      if (!fs.existsSync(workflowTestsPath)) {
        fs.mkdirSync(workflowTestsPath, { recursive: true });
      }
      try {
        fs.writeFileSync(unitTestsPath, JSON.stringify(unitTestDefinition, null, 4));
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

export const getUnitTestName = (filePath: string) => {
  const unitTestFileName = path.basename(filePath);
  const fileNameItems = unitTestFileName.split('.');
  return fileNameItems[0];
};

const getUnitTestsPath = (projectPath: string, workflowName: string, unitTestName: string) => {
  return path.join(projectPath, developmentDirectoryName, testsDirectoryName, workflowName, `${unitTestName}${unitTestsFileName}`);
};

const getWorkflowTestsPath = (projectPath: string, workflowName: string) => {
  return path.join(projectPath, developmentDirectoryName, testsDirectoryName, workflowName);
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
  } else if (!/^[a-z][a-z\d_-]*$/i.test(name)) {
    return localize(
      'unitTestNameInvalidMessage',
      'Unit test name must start with a letter and can only contain letters, digits, "_" and "-".'
    );
  } else {
    return await validateUnitTestNameCore(projectPath, workflowName, name);
  }
};

/**
 * Validates the unit test name for a given project, workflow, and name.
 * @param {string} projectPath - The path of the project.
 * @param {string} workflowName - The name of the workflow.
 * @param {string} name - The name of the unit test.
 * @returns A string representing an error message if a unit test with the same name already exists, otherwise undefined.
 */
const validateUnitTestNameCore = async (projectPath: string, workflowName: string, name: string): Promise<string | undefined> => {
  const workflowTestsPath = getWorkflowTestsPath(projectPath, workflowName);

  if (await fse.pathExists(path.join(workflowTestsPath, `${name}${unitTestsFileName}`))) {
    return localize('existingUnitTestError', 'A unit test with the name "{0}" already exists.', name);
  } else {
    return undefined;
  }
};
