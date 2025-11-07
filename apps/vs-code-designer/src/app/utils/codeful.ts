import path from 'path';
import * as fse from 'fs-extra';
import { localSettingsFileName } from '../../constants';

/**
 * Checks if the codeful agent is enabled for a given folder by examining the local settings file.
 * @param folderPath - The path to the folder containing the local settings file
 * @returns A promise that resolves to true if the codeful agent is enabled, false otherwise
 * @remarks
 * This function reads the local settings file (typically local.settings.json) from the specified
 * folder path and checks for the WORKFLOW_CODEFUL_ENABLED flag in the Values section.
 * Returns false if the file doesn't exist, cannot be read, or doesn't contain valid JSON.
 */
export const hasCodefulWorkflowSetting = async (folderPath: string) => {
  const localSettingsFilePath = path.join(folderPath, localSettingsFileName);
  if (!(await fse.pathExists(localSettingsFilePath))) {
    return false;
  }

  try {
    const localSettingsData = await fse.readFile(localSettingsFilePath, 'utf-8');
    const localSettings = JSON.parse(localSettingsData);
    return localSettings.Values?.WORKFLOW_CODEFUL_ENABLED;
  } catch {
    return false;
  }
};

/**
 * Checks if the folder is a custom code functions project.
 * @param {string} folderPath - The folder path.
 * @returns {Promise<boolean>} Returns true if the folder is a custom code functions project, otherwise false.
 */
export const isCodefulProject = async (folderPath: string): Promise<boolean> => {
  if (!fse.statSync(folderPath).isDirectory()) {
    return false;
  }
  const files = await fse.readdir(folderPath);
  const csprojFile = files.find((file) => file.endsWith('.csproj'));
  if (!csprojFile) {
    return false;
  }

  const csprojContent = await fse.readFile(path.join(folderPath, csprojFile), 'utf-8');
  return isCodefulNet8Csproj(csprojContent);
};

/**
 * Checks if a C# project file (.csproj) is configured for a codeful .NET 8 Azure Logic Apps workflow.
 *
 * @param csprojContent - The content of the .csproj file as a string
 * @returns `true` if the project targets .NET 8 and includes the Microsoft.Azure.Workflows.Sdk.Agents package, `false` otherwise
 */
const isCodefulNet8Csproj = (csprojContent: string): boolean => {
  return (
    csprojContent.includes('<TargetFramework>net8</TargetFramework>') && csprojContent.includes('Microsoft.Azure.Workflows.Sdk.Agents')
  );
};
