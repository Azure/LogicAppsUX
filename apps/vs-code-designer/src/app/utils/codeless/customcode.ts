import * as path from 'path';
import * as fse from 'fs-extra';
import { localize } from '../../../localize';
import { parseError } from '@microsoft/vscode-azext-utils';
import { workflowFileName } from '../../../constants';
/**
 * Retrieves the custom code files.
 * @param {string} workflowFilePath The path to the workflow folder.
 * @returns A promise that resolves to a Record<string, string> object representing the custom code files.
 * @throws An error if the custom code files cannot be parsed.
 */
export async function getCustomCode(workflowFilePath: string): Promise<Record<string, string>> {
  console.log(workflowFilePath);
  const customCodeFiles: Record<string, string> = {};
  try {
    const subPaths: string[] = await fse.readdir(workflowFilePath);
    console.log(subPaths);
    for (const subPath of subPaths) {
      const fullPath: string = path.join(workflowFilePath, subPath);

      if ((await fse.pathExists(fullPath)) && subPath !== workflowFileName) {
        customCodeFiles[subPath] = fse.readFileSync(workflowFilePath, 'utf8');
      }
    }
  } catch (error) {
    const message: string = localize('failedToParse', 'Failed to parse "{0}": {1}.', workflowFilePath, parseError(error).message);
    throw new Error(message);
  }

  return customCodeFiles;
}
