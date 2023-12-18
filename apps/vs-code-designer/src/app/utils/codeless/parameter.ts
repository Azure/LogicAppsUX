import { parametersFileName } from '../../../constants';
import { localize } from '../../../localize';
import { isCSharpProject } from '../../commands/initProjectForVSCode/detectProjectLanguage';
import { writeFormattedJson } from '../fs';
import { parseJson } from '../parseJson';
import { getLogicAppProjectRoot } from './connection';
import { addNewFileInCSharpProject } from './updateBuildFile';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { parseError } from '@microsoft/vscode-azext-utils';
import type { Parameter, WorkflowParameter } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';

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

export async function saveParameters(context: IActionContext, workflowFilePath: string, parameters: WorkflowParameter): Promise<void> {
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
