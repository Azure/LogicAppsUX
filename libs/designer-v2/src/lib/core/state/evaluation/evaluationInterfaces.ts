import type { Evaluator } from '@microsoft/logic-apps-shared';

export type RightPanelView = 'empty' | 'create' | 'edit' | 'view' | 'result';

export interface AgentAction {
  name: string;
  status: string;
  startTime: string;
  endTime: string;
}

export interface WorkflowRunEntry {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface EvaluationState {
  selectedEvaluator: Evaluator | null;
  selectedRun: WorkflowRunEntry | null;
  selectedAction: AgentAction | null;
  agentActions: AgentAction[];
  agentActionsLoading: boolean;
  rightPanelView: RightPanelView;
  runningEvaluatorName: string;
  searchQuery: string;
}
