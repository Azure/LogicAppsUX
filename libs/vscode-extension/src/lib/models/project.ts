import type { IWorkerRuntime } from './cliFeed';
import type { FuncVersion } from './functions';
import type { IParsedHostJson } from './host';
import type { ProjectLanguage } from './language';
import type { TargetFramework, WorkflowProjectType } from './workflow';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { Uri, WorkspaceFolder } from 'vscode';

export const ProjectName = {
  export: 'export',
  overview: 'overview',
  review: 'review',
  designer: 'designer',
  dataMapper: 'dataMapper',
  unitTest: 'unitTest',
} as const;
export type ProjectNameType = (typeof ProjectName)[keyof typeof ProjectName];

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
  functionAppNamespace?: string;
  functionAppName?: string;
  customCodeFunctionName?: string;
  functionFolderPath?: string;
  logicAppFolderPath?: string;
  projectPath: string;
  version: FuncVersion;
  workspacePath: string;
  workspaceCustomFilePath?: string;
  workspaceFolder: WorkspaceFolder | undefined;
  customWorkspaceFolderPath?: string;
  projectTemplateKey: string | undefined;
  isCodeless?: boolean;
  language?: ProjectLanguage;
  languageFilter?: RegExp;
  workerRuntime?: IWorkerRuntime;
  openBehavior?: OpenBehavior;
  workspaceName?: string;
  workflowProjectType?: WorkflowProjectType;
  generateFromOpenAPI?: boolean;
  openApiSpecificationFile?: Uri[];
  targetFramework?: TargetFramework;
  projectType?: ProjectType;
  shouldCreateLogicAppProject?: boolean;
  isWorkspaceWithFunctions?: boolean;
  logicAppName?: string;
  packagePath?: string;
  deploymentScriptType?: DeploymentScriptType;
}

export const OpenBehavior = {
  addToWorkspace: 'AddToWorkspace',
  openInNewWindow: 'OpenInNewWindow',
  openInCurrentWindow: 'OpenInCurrentWindow',
  alreadyOpen: 'AlreadyOpen',
  dontOpen: 'DontOpen',
} as const;
export type OpenBehavior = (typeof OpenBehavior)[keyof typeof OpenBehavior];

export const ProjectType = {
  logicApp: 'logicApp',
  customCode: 'customCode',
  rulesEngine: 'rulesEngine',
} as const;
export type ProjectType = (typeof ProjectType)[keyof typeof ProjectType];

export const DeploymentScriptType = {
  azureDevOpsPipeline: 'azureDevOpsPipeline',
  azureDeploymentCenter: 'azureDeploymentCenter',
} as const;
export type DeploymentScriptType = (typeof DeploymentScriptType)[keyof typeof DeploymentScriptType];
