import type { Artifacts, FileDetails } from './artifact';
import type { Parameter } from './parameter';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

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
  value?: any;
  defaultValue?: any;
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

export const WorkflowProjectType = {
  Nuget: 'Nuget',
  Bundle: 'Bundle',
  Functions: 'Functions',
} as const;
export type WorkflowProjectType = (typeof WorkflowProjectType)[keyof typeof WorkflowProjectType];

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

export const MismatchBehavior = {
  /**
   * Asks the user if they want to overwrite
   */
  Prompt: 'Prompt',

  /**
   * Overwrites without prompting
   */
  Overwrite: 'Overwrite',

  /**
   * Returns without changing anything
   */
  DontChange: 'DontChange',
} as const;
export type MismatchBehavior = (typeof MismatchBehavior)[keyof typeof MismatchBehavior];

export const TargetFramework = {
  NetFx: 'net472',
  Net6: 'net6',
  Net8: 'net8',
} as const;
export type TargetFramework = (typeof TargetFramework)[keyof typeof TargetFramework];
