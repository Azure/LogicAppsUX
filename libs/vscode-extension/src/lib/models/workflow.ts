import type { Artifacts, FileDetails } from './artifact';
import type { Parameter } from './parameter';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';

export interface ILocalSettingsJson {
  IsEncrypted?: boolean;
  Values?: { [key: string]: string };
  Host?: { [key: string]: string };
  ConnectionStrings?: { [key: string]: string };
}

export interface IDesignerPanelMetadata {
  panelId: string;
  appSettingNames?: string[];
  standardApp: StandardApp;
  connectionsData: string;
  parametersData: Record<string, Parameter>;
  localSettings: Record<string, string>;
  azureDetails: AzureConnectorDetails;
  workflowDetails: Record<string, any>;
  workflowName: string;
  artifacts: Artifacts;
  workflowContent?: any;
  configuredWebhookEndpoint?: string;
  accessToken?: string;
  schemaArtifacts: FileDetails[];
  mapArtifacts: Record<string, FileDetails[]>;
}

export interface StandardApp {
  statelessRunMode?: string;
  definition: LogicAppsV2.WorkflowDefinition;
  name?: string;
  stateful?: boolean;
  kind: string;
  operationOptions?: string;
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
  Functions = 'Functions',
}

export enum TargetFramework {
  NetFx = 'net472',
  Net6 = 'net6',
}

export interface ISettingToAdd {
  key: string;
  value: string | boolean | Record<string, any>;
  prefix?: string;
}

export interface IWorkflowStateTypeStepOptions {
  isProjectWizard: boolean;
  templateId: string | undefined;
  triggerSettings: { [key: string]: string | undefined } | undefined;
}

export enum MismatchBehavior {
  /**
   * Asks the user if they want to overwrite
   */
  Prompt,

  /**
   * Overwrites without prompting
   */
  Overwrite,

  /**
   * Returns without changing anything
   */
  DontChange,
}
