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
  workflowContent: any;
  workflowDetails: Record<string, any>;
  artifacts: Artifacts;
  configuredWebhookEndpoint: string;
}

export interface CodelessApp {
  statelessRunMode?: string;
  definition: any;
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
  definition: Record<string, any>;
  kind: string;
  isDisabled: boolean;
}
