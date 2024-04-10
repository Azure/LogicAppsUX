import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

export interface Workflow {
  definition: LogicAppsV2.WorkflowDefinition;
  connectionReferences: ConnectionReferences;
  parameters?: Record<string, WorkflowParameter>;
  kind?: string;
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

export const ImpersonationSource = {
  Invoker: 'invoker',
} as const;
export type ImpersonationSource = (typeof ImpersonationSource)[keyof typeof ImpersonationSource];

export type ReferenceKey = string;
export type ConnectionReferences = Record<ReferenceKey, ConnectionReference>;

export type NodeId = string;
export type ConnectionMapping = Record<NodeId, ReferenceKey | null>;

export interface WorkflowParameter {
  name?: string;
  type: string;
  value?: any;
  defaultValue?: any;
  metadata?: any;
  description?: string;
  allowedValues?: any[];
}
