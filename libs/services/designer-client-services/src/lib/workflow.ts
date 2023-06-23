import type { ManagedIdentity } from '@microsoft/utils-logic-apps';
import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';

export interface CallbackInfo {
  method?: string;
  value: string;
}

export interface IWorkflowService {
  /**
   * Gets callback url for manual trigger.
   */
  getCallbackUrl(triggerName: string): Promise<CallbackInfo>;

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
