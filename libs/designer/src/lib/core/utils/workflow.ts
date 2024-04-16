import { WorkflowKind } from '../state/workflow/workflowInterfaces';
import { equals } from '@microsoft/logic-apps-shared';

export const parseWorkflowKind = (kind?: string): WorkflowKind => {
  if (equals(kind, 'stateful')) {
    return WorkflowKind.STATEFUL;
  }
  if (equals(kind, 'stateless')) {
    return WorkflowKind.STATELESS;
  }
  return undefined;
};
