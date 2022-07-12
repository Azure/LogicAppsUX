export interface Workflow {
  definition: LogicAppsV2.WorkflowDefinition;
  connectionReferences: Record<string, ConnectionReference>;
  parameters?: Record<string, WorkflowParameter>;
}

export interface ConnectionReference {
  api: { id: string };
  connection: { id: string };
  connectionName?: string;
  connectionProperties?: Record<string, any>;
  authentication?: { type: string; identity?: string };
}

export interface WorkflowParameter {
  name: string;
  type: string;
  defaultValue?: any;
  value?: any;
  metadata?: any;
  description?: string;
  allowedValues?: any[];
}
