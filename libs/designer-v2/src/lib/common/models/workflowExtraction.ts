import type { LogicAppsV2, OpenAPIV2 } from '@microsoft/logic-apps-shared';
import type { Workflow } from './workflow';

export interface WorkflowExtractionBinding {
  name: string;
  expression: string;
  schema: OpenAPIV2.SchemaObject;
  rewrittenExpression: string;
}

export interface WorkflowExtractionPlan {
  source: Workflow;
  child: Workflow;
  childName: string;
  selectedIds: string[];
  invocationId: string;
  inputs: WorkflowExtractionBinding[];
  outputs: WorkflowExtractionBinding[];
}

export interface WorkflowExtractionRequest {
  operationId: string;
  sourceFingerprint: string;
  plan: WorkflowExtractionPlan;
}

export interface ExtractedWorkflowReference {
  name: string;
  href: string;
}

export type WorkflowExtractionResult =
  | { status: 'completed'; child: ExtractedWorkflowReference }
  | { status: 'child-created'; child: ExtractedWorkflowReference; message: string }
  | { status: 'source-saved'; child: ExtractedWorkflowReference; message: string };

/**
 * Opt-in host boundary. Persistence, name collision protection and retry
 * idempotency belong to the host, not to the workflow transformation.
 */
export interface WorkflowExtractionService {
  hostingPlan: 'standard';
  persistenceDescription: string;
  sourceId: string;
  sourceName: string;
  createInvocation: (
    childName: string,
    body: Record<string, string>,
    runAfter: LogicAppsV2.ActionDefinition['runAfter']
  ) => LogicAppsV2.ActionDefinition;
  validateName: (name: string) => string | undefined;
  getSuggestedName?: (baseName: string) => string | Promise<string>;
  prepare?: (plan: WorkflowExtractionPlan) => () => void;
  commit: (request: WorkflowExtractionRequest) => Promise<WorkflowExtractionResult>;
  onApplied?: (workflow: Workflow) => void;
}
