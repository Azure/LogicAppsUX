import type { LogicAppsV2, ManagedIdentity, OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { AssertionErrorCode, AssertionException } from '@microsoft/logic-apps-shared';

export interface Callback {
  method?: string;
  value: string;
}

export interface NodeOutputs {
  outputs: Record<string, OutputInfo>;
  originalOutputs?: Record<string, OutputInfo>;
}

export interface OutputInfo {
  description?: string;
  type: string;
  format?: string;
  isAdvanced: boolean;
  isDynamic?: boolean;
  isInsideArray?: boolean;
  itemSchema?: OpenAPIV2.SchemaObject;
  key: string;
  name: string;
  parentArray?: string;
  required?: boolean;
  schema?: OpenAPIV2.SchemaObject;
  source?: string;
  title: string;
  value?: string;
  alias?: string;
}

export interface IWorkflowService {
  /**
   * Gets callback url for manual trigger.
   */
  getCallbackUrl(triggerName: string): Promise<Callback>;

  /**
   * Gets managed identity associated with workflow app.
   */
  getAppIdentity?(): ManagedIdentity | undefined;

  /**
   * Checks if explicit authentication is needed for managed identity connections.
   */
  isExplicitAuthRequiredForManagedIdentity?(): boolean;

  /**
   * Gets definition schema version from current operation types.
   */
  getDefinitionSchema?(operationInfos: { type: string; kind?: string }[]): string;

  /**
   * Updates the serialized workflow with dynamic inputs from references.
   */
  getDefinitionWithDynamicInputs?(
    serializedWorkflow: LogicAppsV2.WorkflowDefinition,
    outputParameters: Record<string, NodeOutputs>
  ): LogicAppsV2.WorkflowDefinition;

  /**
   * Resubmits workflow from a specific action
   */
  resubmitWorkflow?(runId: string, actionsToResubmit: string[]): void;
}

let service: IWorkflowService;

export const InitWorkflowService = (workflowService: IWorkflowService): void => {
  service = workflowService;
};

export const WorkflowService = (): IWorkflowService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Workflow Service needs to be initialized before using');
  }

  return service;
};
