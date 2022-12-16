import type { Artifacts } from './artifact';
import type { Parameter } from './parameter';

export interface ILocalSettingsJson {
  IsEncrypted?: boolean;
  Values?: { [key: string]: string };
  Host?: { [key: string]: string };
  ConnectionStrings?: { [key: string]: string };
}

export interface IDesignerPanelMetadata {
  appSettingNames?: string[];
  codelessApp: CodelessApp;
  scriptPath: string;
  connectionsData: string;
  parametersData: Record<string, Parameter>;
  localSettings: Record<string, string>;
  azureDetails: AzureConnectorDetails;
  workflowDetails: Record<string, any>;
  artifacts: Artifacts;
  workflowContent?: any;
  configuredWebhookEndpoint?: string;
  accessToken?: string;
}

export interface CodelessApp {
  statelessRunMode?: string;
  definition: LogicAppsV2.WorkflowDefinition;
  name: string;
  stateful: boolean;
  kind: string;
  operationOptions: string;
}

export interface AzureConnectorDetails {
  enabled: boolean;
  accessToken?: string;
  location?: string;
  resourceGroupName?: string;
  subscriptionId?: string;
  tenantId?: string;
  workflowManagementBaseUrl?: string;
}

export interface WorkflowParameter {
  type: string;
  defaultValue: any;
  allowedValues?: any[];
  metadata?: any;
}

export interface IWorkflowFileContent {
  name: string;
  definition: any; // Work to be done
  kind: string;
  runtimeConfiguration: {
    statelessRunMode: string;
    operationOptions: string;
  };
}

export interface ICallbackUrlResponse {
  value: string;
  method: string;
  basePath?: string;
  relativePath?: string;
  relativeParameters?: [];
  queries?: Record<string, any>;
}

export enum WorkflowProjectType {
  Nuget = 'Nuget',
  Bundle = 'Bundle',
}

export interface ISettingToAdd {
  key: string;
  value: string | boolean | Record<string, any>;
  prefix?: string;
}

export interface IWorkflowListStepOptions {
  isProjectWizard: boolean;
  templateId: string | undefined;
  triggerSettings: { [key: string]: string | undefined } | undefined;
}
