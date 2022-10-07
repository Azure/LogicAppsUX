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

export interface Parameter {
  type: string;
  metadata?: any;
  description?: string;
  allowedValues?: any[];
  value: any;
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

export interface Artifacts {
  maps: Record<string, FileDetails[]>;
  schemas: FileDetails[];
}

interface FileDetails {
  name: string;
  fileName: string;
  relativePath: string;
}
