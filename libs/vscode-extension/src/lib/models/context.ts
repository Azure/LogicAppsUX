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
  connectedEnvironment?: ConnectedEnvironment;
  fileShare?: {
    hostName?: string;
    path?: string;
    domain?: string;
    userName?: string;
    password?: string;
  };
  aad?: {
    clientId?: string;
    clientSecret?: string;
    objectId?: string;
    tenantId?: string;
  };
  suppressCreate?: boolean;
  fileShareName?: string;
  useHybrid?: boolean;
  hybridSite?: ContainerApp;
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
