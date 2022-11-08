import type { ManagedIdentity } from '@microsoft-logic-apps/utils';
import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';

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
}

let service: IWorkflowService;

export const InitWorkflowService = (workflowService: IWorkflowService): void => {
  service = workflowService;
};

export const WorkflowService = (): IWorkflowService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Workflow Service need to be initialized before using');
  }

  return service;
};
