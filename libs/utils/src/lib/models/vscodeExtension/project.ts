import type { FuncVersion } from './functions';
import type { IParsedHostJson } from './host';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

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
