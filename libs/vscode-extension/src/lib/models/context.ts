import type { StorageOptions } from './connection';
import type { FuncVersion } from './functions';
import type { IAppServiceWizardContext } from '@microsoft/vscode-azext-azureappservice';
import type { ExecuteActivityContext, IActionContext, ICreateChildImplContext } from '@microsoft/vscode-azext-utils';

export interface IIdentityWizardContext extends IActionContext {
  clientId?: string;
  clientSecret?: string;
  objectId?: string;
  tenantId?: string;
  useAdvancedIdentity?: boolean;
}

export interface IFunctionAppWizardContext extends IAppServiceWizardContext, ICreateChildImplContext, ExecuteActivityContext {
  version: FuncVersion;
  language: string | undefined;
  newSiteRuntime?: string;
  runtimeFilter?: string;
  storageType?: StorageOptions;
  sqlConnectionString?: string;
}

export interface ICreateLogicAppContext extends ICreateChildImplContext {
  newResourceGroupName?: string;
}

export interface IDebugModeContext extends IActionContext {
  projectPath: string;
  workflowName: string;
  enableDebugMode?: boolean;
}
