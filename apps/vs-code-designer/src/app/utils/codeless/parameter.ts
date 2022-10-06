import { parametersFileName } from '../../../constants';
import { localize } from '../../../localize';
import { parseJson } from '../parseJson';
import type { Parameter } from './types';
import { parseError } from '@microsoft/vscode-azext-utils';
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
