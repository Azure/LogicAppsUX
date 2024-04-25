/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parametersFileName } from '../../../constants';
import { localize } from '../../../localize';
import { isCSharpProject } from '../../commands/initProjectForVSCode/detectProjectLanguage';
import { writeFormattedJson } from '../fs';
import { parseJson } from '../parseJson';
import { getLogicAppProjectRoot } from './connection';
import { addNewFileInCSharpProject } from './updateBuildFile';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { parseError } from '@microsoft/vscode-azext-utils';
import type { Parameter, WorkflowParameter } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';

/**
 * Retrieves the parameters JSON object from a workflow file.
 * @param {string} workflowFilePath The path to the workflow file.
 * @returns A promise that resolves to a Record<string, Parameter> object representing the parameters.
 * @throws An error if the parameters file cannot be parsed.
 */
export async function getParametersJson(workflowFilePath: string): Promise<Record<string, Parameter>> {
  const parameterFilePath: string = path.join(workflowFilePath, parametersFileName);
  if (await fse.pathExists(parameterFilePath)) {
    const data: string = (await fse.readFile(parameterFilePath)).toString();
    if (/[^\s]/.test(data)) {
      try {
        return parseJson(data);
      } catch (error) {
        const message: string = localize('failedToParse', 'Failed to parse "{0}": {1}.', parametersFileName, parseError(error).message);
        throw new Error(message);
      }
    }
  }
  return {};
}

export async function saveWorkflowParameter(
  context: IActionContext,
  workflowFilePath: string,
  parameters: Record<string, Parameter>
): Promise<void> {
  const projectPath = await getLogicAppProjectRoot(context, workflowFilePath);
  const parametersFilePath = path.join(projectPath, parametersFileName);
  const parametersFileExists = fse.pathExistsSync(parametersFilePath);

  if (parameters && Object.keys(parameters).length) {
    await writeFormattedJson(parametersFilePath, parameters);
    if (!parametersFileExists && (await isCSharpProject(context, projectPath))) {
      await addNewFileInCSharpProject(context, parametersFileName, projectPath);
    }
  } else if (parametersFileExists) {
    await writeFormattedJson(parametersFilePath, parameters);
  }
}

/**
 * Saves the workflow parameter records to a file.
 * @param {IActionContext} context - The action context.
 * @param {string} workflowFilePath - The path of the workflow file.
 * @param {Record<string, WorkflowParameter>} workflowParameterRecords - The workflow parameter records to save.
 * @returns A promise that resolves when the workflow parameter records are saved.
 */
export async function saveWorkflowParameterRecords(
  context: IActionContext,
  workflowFilePath: string,
  workflowParameterRecords: Record<string, WorkflowParameter>
): Promise<void> {
  const workflowParameterObject = getWorkflowParameterObject(workflowParameterRecords);
  await saveWorkflowParameter(context, workflowFilePath, workflowParameterObject);
}

export function getStringParameter(value: any): Parameter {
  return getParameter('String', value);
}

export function getParameter(type: string, value: any): Parameter {
  return {
    type: type,
    value: value,
  };
}

function getWorkflowParameterObject(workflowParameterRecords: Record<string, any>): any {
  const workflowParameterObject = {};
  Object.entries(workflowParameterRecords).forEach(([key, parameter]) => {
    parameter.value = parameter.value ?? parameter.defaultValue;
    delete parameter.defaultValue;
    workflowParameterObject[key] = parameter;
  });

  return workflowParameterObject;
}
