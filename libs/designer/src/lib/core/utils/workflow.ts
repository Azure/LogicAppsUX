import { WorkflowKind } from '../state/workflow/workflowInterfaces';
import { equals } from '@microsoft/utils-logic-apps';

export const parseWorkflowKind = (kind?: string): WorkflowKind => {
  if (equals(kind, 'stateful')) return WorkflowKind.STATEFUL;
  if (equals(kind, 'stateless')) return WorkflowKind.STATELESS;
  return undefined;
};
