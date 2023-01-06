import type { StorageOptions } from './connection';
import type { FuncVersion } from './functions';
import type { IAppServiceWizardContext } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext, ICreateChildImplContext } from '@microsoft/vscode-azext-utils';

export interface IIdentityWizardContext extends IActionContext {
  clientId?: string;
  clientSecret?: string;
  objectId?: string;
  tenantId?: string;
  useAdvancedIdentity?: boolean;
}

export interface IFunctionAppWizardContext extends IAppServiceWizardContext {
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
