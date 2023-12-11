/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export const saveUnitTestDefinition = async (
  projectPath: string,
  workflowName: string,
  unitTestName: string,
  unitTestDefinition: any
): Promise<void> => {
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
};

const getUnitTestsPath = (projectPath: string, workflowName: string, unitTestName: string) => {
  return path.join(projectPath, workflowName, 'development', 'tests', workflowName, `${unitTestName}.unit-test.json`);
};

const getWorkflowTestsPath = (projectPath: string, workflowName: string) => {
  return path.join(projectPath, workflowName, 'development', 'tests', workflowName);
};
