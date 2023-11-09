import type { IWorkerRuntime } from './cliFeed';
import type { FuncVersion } from './functions';
import type { IParsedHostJson } from './host';
import type { ProjectLanguage } from './language';
import type { TargetFramework, WorkflowProjectType } from './workflow';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { Uri, WorkspaceFolder } from 'vscode';

export enum ProjectSource {
  Remote = 'Remote',
  Local = 'Local',
}

export enum ProjectAccess {
  ReadOnly = 'ReadOnly',
  ReadWrite = 'ReadWrite',
}

export enum ProjectResource {
  Functions = 'Functions',
  Function = 'Function',
  Workflows = 'Workflows',
  Workflow = 'Workflow',
  Configurations = 'Configurations',
  Connections = 'Connections',
  Connection = 'Connection',
  Parameters = 'Parameters',
  Parameter = 'Parameter',
}

export type ProjectVersion = '~1' | '~2' | '~3' | '~4';

export type ApplicationSettings = { [propertyName: string]: string };

export type FuncHostRequest = { url: string; rejectUnauthorized?: boolean };

export interface IProjectTreeItem {
  source: ProjectSource;
  getHostRequest(context: IActionContext): Promise<FuncHostRequest>;
  getHostJson(context: IActionContext): Promise<IParsedHostJson>;
  getVersion(context: IActionContext): Promise<FuncVersion>;
  getApplicationSettings(context: IActionContext): Promise<ApplicationSettings>;
  setApplicationSetting(context: IActionContext, key: string, value: string): Promise<void>;
}

export interface IProjectWizardContext extends IActionContext {
  namespaceName?: string;
  methodName?: string;
  functionFolderPath?: string;
  logicAppFolderPath?: string;
  projectPath: string;
  version: FuncVersion;
  workspacePath: string;
  workspaceFolder: WorkspaceFolder | undefined;
  projectTemplateKey: string | undefined;
  language?: ProjectLanguage;
  languageFilter?: RegExp;
  workerRuntime?: IWorkerRuntime;
  openBehavior?: OpenBehavior;
  workspaceName?: string;
  workflowProjectType?: WorkflowProjectType;
  generateFromOpenAPI?: boolean;
  openApiSpecificationFile?: Uri[];
  targetFramework?: TargetFramework;
}

export enum OpenBehavior {
  addToWorkspace = 'AddToWorkspace',
  openInNewWindow = 'OpenInNewWindow',
  openInCurrentWindow = 'OpenInCurrentWindow',
  alreadyOpen = 'AlreadyOpen',
  dontOpen = 'DontOpen',
}
