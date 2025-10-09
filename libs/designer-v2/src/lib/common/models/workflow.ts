import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { XYPosition } from '@xyflow/react';

export interface Workflow {
  definition: LogicAppsV2.WorkflowDefinition;
  connectionReferences: ConnectionReferences;
  parameters?: Record<string, WorkflowParameter>;
  notes?: Record<string, Note>;
  kind?: string;
  id?: string;
}

export interface ConnectionReference {
  api: { id: string };
  connection: { id: string };
  connectionId?: string;
  connectionName?: string;
  connectionProperties?: Record<string, any>;
  connectionRuntimeUrl?: string;
  authentication?: ApiHubAuthentication;
  impersonation?: Impersonation;
  resourceId?: string;
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

export type Note = {
  content: string;
  color: string;
  metadata: {
    position: XYPosition;
    width: number;
    height: number;
  };
};
