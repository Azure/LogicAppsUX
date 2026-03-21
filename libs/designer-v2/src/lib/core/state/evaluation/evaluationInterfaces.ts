import type { Evaluator } from '@microsoft/logic-apps-shared';

export type RightPanelView = 'empty' | 'create' | 'edit' | 'view' | 'result';

export interface EvaluationState {
  selectedEvaluator: Evaluator | null;
  selectedAgentName: string | null;
  rightPanelView: RightPanelView;
  runningEvaluatorName: string;
  evaluatorSearchQuery: string;
}
