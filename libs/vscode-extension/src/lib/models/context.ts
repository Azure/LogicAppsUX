import type { StorageOptions } from './connection';
import type { FuncVersion } from './functions';
import type { ConnectedEnvironment, ContainerApp } from '@azure/arm-appcontainers';
import type { IAppServiceWizardContext } from '@microsoft/vscode-azext-azureappservice';
import type { ExecuteActivityContext, IActionContext, ICreateChildImplContext } from '@microsoft/vscode-azext-utils';

export interface IIdentityWizardContext extends IActionContext {
  clientId?: string;
  clientSecret?: string;
  objectId?: string;
  tenantId?: string;
  useAdvancedIdentity?: boolean;
}

export interface ILogicAppWizardContext extends IAppServiceWizardContext, ICreateChildImplContext, ExecuteActivityContext {
  version: FuncVersion;
  language: string | undefined;
  newSiteRuntime?: string;
  runtimeFilter?: string;
  storageType?: StorageOptions;
  sqlConnectionString?: string;
  useContainerApps?: boolean;
  containerApp?: ContainerApp;
  connectedEnvironment?: ConnectedEnvironment;
  hostName?: string;
  fileSharePath?: string;
  userName?: string;
  passwordFileShare?: string;
  suppressCreate?: boolean;
  fileShareName?: string;
  _location?: Record<string, any>;
}

export interface ICreateLogicAppContext extends ICreateChildImplContext {
  newResourceGroupName?: string;
}

export interface IDebugModeContext extends IActionContext {
  projectPath: string;
  workflowName: string;
  enableDebugMode?: boolean;
}
