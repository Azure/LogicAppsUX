import type { Workflow } from '../../utils/src';
import { AssertionErrorCode, AssertionException } from '../../utils/src';

export interface WorkflowEditResponse {
  /** Whether the LLM returned a workflow modification or just a text reply */
  type: 'workflow' | 'text';
  /** Description of changes or text reply content */
  text: string;
  /** The modified workflow definition, only present when type is 'workflow' */
  workflow?: Workflow;
}

export interface ICopilotWorkflowEditorService {
  /**
   * Sends a user prompt along with the current workflow to an LLM and returns
   * either a modified workflow or a text response (for questions).
   */
  getWorkflowEdit(prompt: string, workflow: Workflow, signal?: AbortSignal): Promise<WorkflowEditResponse>;
}

let service: ICopilotWorkflowEditorService | undefined;

export const InitCopilotWorkflowEditorService = (editorService: ICopilotWorkflowEditorService): void => {
  service = editorService;
};

export const CopilotWorkflowEditorService = (): ICopilotWorkflowEditorService => {
  if (!service) {
    throw new AssertionException(
      AssertionErrorCode.SERVICE_NOT_INITIALIZED,
      'CopilotWorkflowEditor Service needs to be initialized before using'
    );
  }
  return service;
};

export const isCopilotWorkflowEditorServiceInitialized = (): boolean => {
  return !!service;
};
