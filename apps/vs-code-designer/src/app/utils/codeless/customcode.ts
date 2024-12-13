import * as path from 'path';
import * as fse from 'fs-extra';
import { localize } from '../../../localize';
import { parseError } from '@microsoft/vscode-azext-utils';
import { hostFileName, powershellRequirementsFileName, workflowFileName } from '../../../constants';
import type { CustomCodeFileNameMapping } from '@microsoft/vscode-extension-logic-apps';
import { parseJson } from '../parseJson';
import { getAppFileForFileExtension } from '@microsoft/logic-apps-shared';
/**
 * Retrieves the custom code files.
 * @param {string} workflowFilePath The path to the workflow folder.
 * @returns A promise that resolves to a Record<string, string> object representing the custom code files.
 * @throws An error if the custom code files cannot be parsed.
 */
export async function getCustomCode(workflowFilePath: string): Promise<Record<string, string>> {
  const customCodeFiles: Record<string, string> = {};
  try {
    const subPaths: string[] = await fse.readdir(workflowFilePath);
    for (const subPath of subPaths) {
      const fullPath: string = path.join(workflowFilePath, subPath);

      if ((await fse.pathExists(fullPath)) && subPath !== workflowFileName) {
        if ((await fse.stat(fullPath)).isFile()) {
          customCodeFiles[subPath] = await fse.readFile(fullPath, 'utf8');
        }
      }
    }
  } catch (error) {
    const message: string = localize('failedToParse', 'Failed to parse "{0}": {1}.', workflowFilePath, parseError(error).message);
    throw new Error(message);
  }

  return customCodeFiles;
}

export async function getCustomCodeAppFilesToUpdate(
  workflowFilePath: string,
  customCodeFiles?: CustomCodeFileNameMapping
): Promise<Record<string, string>> {
  //   // only powershell files have custom app files
  //   // to reduce the number of requests, we only check if there are any modified powershell files
  if (!customCodeFiles || !Object.values(customCodeFiles).some((file) => file.isModified && file.fileExtension === '.ps1')) {
    return {};
  }
  const appFiles: Record<string, string> = {};
  const hostFilePath: string = path.join(workflowFilePath, hostFileName);
  if (await fse.pathExists(hostFilePath)) {
    const data: string = (await fse.readFile(hostFilePath)).toString();
    if (/[^\s]/.test(data)) {
      try {
        const hostFile: any = parseJson(data);
        if (!hostFile.managedDependency?.enabled) {
          hostFile.managedDependency = {
            enabled: true,
          };
          appFiles['host.json'] = JSON.stringify(hostFile, null, 2);
        }
      } catch (error) {
        const message: string = localize('failedToParse', 'Failed to parse "{0}": {1}.', hostFileName, parseError(error).message);
        throw new Error(message);
      }
    }
  }
  const requirementsFilePath: string = path.join(workflowFilePath, powershellRequirementsFileName);
  if (!(await fse.pathExists(requirementsFilePath))) {
    appFiles['requirements.psd1'] = getAppFileForFileExtension('.ps1');
  }
  return appFiles;
}

export async function uploadCustomCode(workflowFilePath: string, fileName: string, fileData: string): Promise<void> {
  const filePath: string = path.join(workflowFilePath, fileName);
  try {
    await fse.writeFile(filePath, fileData, 'utf8');
  } catch (error) {
    const message: string = localize('Failed to write file at "{0}": {1}', filePath, parseError(error).message);
    throw new Error(message);
  }
}

export async function deleteCustomCode(workflowFilePath: string, fileName: string): Promise<void> {
  const filePath: string = path.join(workflowFilePath, fileName);
  try {
    if (await fse.pathExists(filePath)) {
      await fse.unlink(filePath);
    } else {
      console.warn(`File at "${filePath}" does not exist.`);
    }
  } catch (error) {
    const message = localize('Failed to delete file at "{0}": {1}', filePath, parseError(error).message);
    throw new Error(message);
  }
}
