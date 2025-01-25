import type { ProjectLanguage } from './language';
import type { IProjectWizardContext, ProjectVersion } from './project';
import type { IWorkflowTemplate } from './templates';
import type { ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import type { WorkspaceFolder } from 'vscode';

export const FuncVersion = {
  v1: '~1',
  v2: '~2',
  v3: '~3',
  v4: '~4',
} as const;
export type FuncVersion = (typeof FuncVersion)[keyof typeof FuncVersion];

export const latestGAVersion: FuncVersion = FuncVersion.v4;

export const azureFunctionsVersion = {
  v1: 'Azure Functions v1',
  v2: 'Azure Functions v2',
  v3: 'Azure Functions v3',
  v4: 'Azure Functions v4',
} as const;
export type azureFunctionsVersion = (typeof azureFunctionsVersion)[keyof typeof azureFunctionsVersion];

export interface ICommandResult {
  code: number;
  cmdOutput: string;
  cmdOutputIncludingStderr: string;
  formattedArgs: string;
}

export type pathRelativeFunc = (fsPath1: string, fsPath2: string) => string;

export interface IFunctionWizardContext extends Partial<ISubscriptionContext>, IProjectWizardContext {
  functionTemplate?: IWorkflowTemplate;
  functionName?: string;
}

export interface IPreDebugValidateResult {
  workspace: WorkspaceFolder;
  shouldContinue: boolean;
}

/**
 * The options to use when creating a function. If an option is not specified, the default will be used or the user will be prompted
 */
export interface ICreateFunctionOptions {
  /**
   * The folder containing the Azure Functions project
   */
  folderPath?: string;

  /**
   * The name of the function
   */
  functionName?: string;

  /**
   * The language of the project
   */
  language?: ProjectLanguage;

  /**
   * A filter specifying the langauges to display when creating a project (if there's not already a project)
   */
  languageFilter?: RegExp;

  /**
   * The version of the project. Defaults to the latest GA version
   */
  version?: ProjectVersion;

  /**
   * The id of the template to use.
   * NOTE: The language part of the id is optional. Aka "HttpTrigger" will work just as well as "HttpTrigger-JavaScript"
   */
  templateId?: string;

  /**
   * A case-insensitive object of settings to use for the function
   */
  functionSettings?: {
    [key: string]: string | undefined;
  };

  /**
   * If set to true, it will automatically create a new project without prompting (if there's not already a project). Defaults to false
   */
  suppressCreateProjectPrompt?: boolean;

  /**
   * If set to true, it will not try to open the folder after create finishes. Defaults to false
   */
  suppressOpenFolder?: boolean;
}

export interface INpmDistTag {
  tag: string;
  value: string;
}

export interface IPackageMetadata {
  versions: { [version: string]: Record<string, any> };
}
