import type { Workflow } from '../../utils/src';
import { AssertionErrorCode, AssertionException } from '../../utils/src';

export const WorkflowChangeType = {
  Added: 'added',
  Modified: 'modified',
  Removed: 'removed',
} as const;
export type WorkflowChangeType = (typeof WorkflowChangeType)[keyof typeof WorkflowChangeType];

export interface WorkflowChange {
  /** The type of change (added, modified, removed) */
  changeType: WorkflowChangeType;
  /** The node/action IDs affected by this change */
  nodeIds: string[];
  /** Human-readable description of what changed */
  description: string;
  /** Icon URI for the operation (populated by the host after response) */
  iconUri?: string;
  /** Brand color for the operation (populated by the host after response) */
  brandColor?: string;
}

export interface WorkflowEditResponse {
  /** Whether the LLM returned a workflow modification or just a text reply */
  type: 'workflow' | 'text';
  /** Description of changes or text reply content */
  text: string;
  /** The modified workflow definition, only present when type is 'workflow' */
  workflow?: Workflow;
  /** Structured list of individual changes made, only present when type is 'workflow' */
  changes?: WorkflowChange[];
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
