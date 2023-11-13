import type { IWorkerRuntime } from './cliFeed';
import type { FuncVersion } from './functions';
import type { IParsedHostJson } from './host';
import type { ProjectLanguage } from './language';
import type { WorkflowProjectType } from './workflow';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { Uri, WorkspaceFolder } from 'vscode';

export const ProjectSource = {
  Remote: 'Remote',
  Local: 'Local',
} as const;
export type ProjectSource = (typeof ProjectSource)[keyof typeof ProjectSource];

export const ProjectAccess = {
  ReadOnly: 'ReadOnly',
  ReadWrite: 'ReadWrite',
} as const;
export type ProjectAccess = (typeof ProjectAccess)[keyof typeof ProjectAccess];

export const ProjectResource = {
  Functions: 'Functions',
  Function: 'Function',
  Workflows: 'Workflows',
  Workflow: 'Workflow',
  Configurations: 'Configurations',
  Connections: 'Connections',
  Connection: 'Connection',
  Parameters: 'Parameters',
  Parameter: 'Parameter',
} as const;
export type ProjectResource = (typeof ProjectResource)[keyof typeof ProjectResource];

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
  targetFramework?: string | string[];
}

export const OpenBehavior = {
  addToWorkspace: 'AddToWorkspace',
  openInNewWindow: 'OpenInNewWindow',
  openInCurrentWindow: 'OpenInCurrentWindow',
  alreadyOpen: 'AlreadyOpen',
  dontOpen: 'DontOpen',
} as const;
export type OpenBehavior = (typeof OpenBehavior)[keyof typeof OpenBehavior];
