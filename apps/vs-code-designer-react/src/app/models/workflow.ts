import type { ArmResource } from '@microsoft/logic-apps-designer';

export enum WorkflowState {
  Disabled = 'Disabled',
  Enabled = 'Enabled',
}

export interface TriggerType {
  type: string;
  kind: string;
}

export const Artifact = {
  ConnectionsFile: 'connections.json',
  ParametersFile: 'parameters.json',
  WorkflowFile: 'workflow.json',
} as const;

export interface ArtifactProperties {
  files: {
    [Artifact.WorkflowFile]: WorkflowJson;
    [Artifact.ParametersFile]: ParametersData;
    [Artifact.ConnectionsFile]: ConnectionsData;
  };
  health: {
    state: string;
    error?: {
      code: string;
      message: string;
      target?: string;
    };
  };
}

export interface WorkflowProperties extends ArtifactProperties {
  flowState: WorkflowState;
}

export type Workflow = ArmResource<WorkflowProperties>;

export interface WorkflowJson {
  definition: any;
  kind: string;
  metadata?: {
    automationTaskConfiguration: {
      managedBy: string;
      templateId: string;
    };
  };
}

export enum ConnectionType {
  Function,
  ServiceProvider,
}

export interface FunctionConnectionModel {
  function: {
    id: string;
  };
  triggerUrl: string;
  authentication: {
    type: string;
    name: string;
    value: string;
  };
  displayName?: string;
}

export interface ServiceProviderConnectionModel {
  parameterValues: Record<string, unknown>;
  serviceProvider: {
    id: string;
  };
  displayName?: string;
}

export interface ConnectionsData {
  functionConnections?: Record<string, FunctionConnectionModel>;
  managedApiConnections?: Record<string, ConnectionReferenceModel>;
  serviceProviderConnections?: Record<string, ServiceProviderConnectionModel>;
}

export type ParametersData = Record<string, Parameter>;

export interface Parameter {
  name?: string;
  type: string;
  metadata?: any;
  description?: string;
  allowedValues?: any[];
  value: any;
}

export interface WorkflowParameter {
  name?: string;
  type: string;
  defaultValue: any;
  allowedValues?: any[];
  metadata?: any;
}

export interface ConnectionReferenceModel {
  connection: {
    id: string;
  };
  api: {
    id: string;
  };
  connectionRuntimeUrl: string;
  connectionProperties?: Record<string, unknown>;
  authentication?: ApihubAuthentication;
}

export interface ApihubAuthentication {
  type: string;
  identity?: string;
}

export interface ConnectionRuntimeInfo {
  connectionKey: string;
  runtimeUrls: string[];
}

export interface ApiConnection {
  id: string;
  name: string;
  location: string;
  type: string;
  properties: {
    api: {
      name: string;
      displayName: string;
      iconUri: string;
      id: string;
    };
    connectionRuntimeUrl?: string;
    displayName: string;
    parameterValues: Record<string, unknown>;
    parameterValueSet?: Record<string, unknown>;
    parameterValueType?: string;
    statuses: ConnectionStatus[];
  };
}

interface ConnectionStatusError {
  code: string;
  message: string;
}

interface ConnectionStatus {
  error?: ConnectionStatusError;
  status: string;
  target?: string;
}

export interface CallbackInfo {
  method?: string;
  value: string;
}
