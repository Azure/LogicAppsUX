import type { StorageOptions } from './connection';
import type { FuncVersion } from './functions';
import type { ConnectedEnvironment, ContainerApp } from '@azure/arm-appcontainers';
import type { ApplicationInsightsComponent } from '@azure/arm-appinsights';
import type { AppServicePlan, Site, SkuDescription } from '@azure/arm-appservice';
import type { Workspace } from '@azure/arm-operationalinsights';
import type { IResourceGroupWizardContext, IStorageAccountWizardContext } from '@microsoft/vscode-azext-azureutils';
import type { ExecuteActivityContext, IActionContext, ICreateChildImplContext } from '@microsoft/vscode-azext-utils';

export type LogicAppSiteKind = 'app' | 'functionapp' | 'workflowapp';
export type LogicAppSiteOS = 'linux' | 'windows';
export type LogicAppDomainNameLabelScope = 'ResourceGroupReuse' | 'SubscriptionReuse' | 'TenantReuse' | 'NoReuse';

interface ILogicAppServiceWizardContext<
  TSiteKind extends LogicAppSiteKind,
  TSiteOS extends LogicAppSiteOS,
  TDomainNameLabelScope extends LogicAppDomainNameLabelScope,
> extends IResourceGroupWizardContext,
    IStorageAccountWizardContext {
  newSiteKind: TSiteKind;
  newSiteOS?: TSiteOS;
  site?: Site;
  newSiteName?: string;
  newSiteDomainNameLabelScope?: TDomainNameLabelScope;
  plan?: AppServicePlan;
  useConsumptionPlan?: boolean;
  newPlanName?: string;
  newPlanSku?: SkuDescription;
  planSkuFamilyFilter?: RegExp;
  plansTask?: Promise<AppServicePlan[]>;
  appInsightsComponent?: ApplicationInsightsComponent;
  appInsightsTask?: Promise<ApplicationInsightsComponent[]>;
  appInsightsSkip?: boolean;
  newAppInsightsName?: string;
  logAnalyticsWorkspace?: Workspace;
  advancedCreation?: boolean;
  customLocation?: {
    name: string;
    id: string;
    kubeEnvironment: {
      name: string;
      id: string;
      location: string;
    };
  };
  zoneRedundant?: boolean;
}

export interface IIdentityWizardContext extends IActionContext {
  clientId?: string;
  clientSecret?: string;
  objectId?: string;
  tenantId?: string;
  useAdvancedIdentity?: boolean;
}

export interface ILogicAppWizardContext<
  // The defaults preserve compatibility with the Azure helper's string enums without publishing that runtime dependency.
  TSiteKind extends LogicAppSiteKind = any,
  TSiteOS extends LogicAppSiteOS = any,
  TDomainNameLabelScope extends LogicAppDomainNameLabelScope = any,
> extends ILogicAppServiceWizardContext<TSiteKind, TSiteOS, TDomainNameLabelScope>,
    ICreateChildImplContext,
    ExecuteActivityContext {
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
  isCreate?: boolean;
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
