import type { Evaluator } from '@microsoft/logic-apps-shared';

export const EvaluationViewMode = {
  None: 'none',
  CreateEvaluator: 'create',
  EditEvaluator: 'edit',
  ViewEvaluator: 'view',
  EvaluationResult: 'result',
  SelectConnection: 'selectConnection',
} as const;
export type EvaluationViewMode = (typeof EvaluationViewMode)[keyof typeof EvaluationViewMode];

export interface EvaluationState {
  selectedEvaluator: Evaluator | null;
  selectedAgentName: string | null;
  viewMode: EvaluationViewMode;
  runningEvaluatorName: string;
  evaluatorSearchQuery: string;
  pendingFormData: unknown;
  previousFormViewMode: EvaluationViewMode | null;
}
