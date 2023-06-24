import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';

export interface Workflow {
  definition: LogicAppsV2.WorkflowDefinition;
  connectionReferences: ConnectionReferences;
  parameters?: Record<string, WorkflowParameter>;
}

export interface ConnectionReference {
  api: { id: string };
  connection: { id: string };
  connectionName?: string;
  connectionProperties?: Record<string, any>;
  connectionRuntimeUrl?: string;
  authentication?: ApiHubAuthentication;
  impersonation?: Impersonation;
}

export interface ApiHubAuthentication {
  type: string;
  identity?: string;
}

export interface Impersonation {
  source?: ImpersonationSource;
  objectId?: string;
}

export enum ImpersonationSource {
  Invoker = 'invoker',
}

type ReferenceKey = string;
export type ConnectionReferences = Record<ReferenceKey, ConnectionReference>;

export interface WorkflowParameter {
  name?: string;
  type: string;
  value?: any;
  defaultValue?: any;
  metadata?: any;
  description?: string;
  allowedValues?: any[];
}
