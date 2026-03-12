import { AssertionException, AssertionErrorCode } from '../../utils/src';
import type { Evaluator, EvaluationResult } from '../../utils/src/lib/models/evaluation';

export interface IEvaluationService {
  // Evaluator management
  getEvaluators(workflowName: string): Promise<Evaluator[]>;
  getEvaluator(workflowName: string, evaluatorName: string): Promise<Evaluator>;
  createOrUpdateEvaluator(workflowName: string, evaluatorName: string, evaluator: Evaluator): Promise<Evaluator>;
  deleteEvaluator(workflowName: string, evaluatorName: string): Promise<void>;

  // Agent (A2A) evaluations
  getEvaluationsForRun(workflowName: string, runId: string): Promise<EvaluationResult[]>;
  getEvaluation(workflowName: string, runId: string, evaluatorName: string): Promise<EvaluationResult>;
  runEvaluation(workflowName: string, runId: string, evaluatorName: string): Promise<EvaluationResult>;

  // Agentic evaluations
  getEvaluationsForAction(workflowName: string, runId: string, agentActionName: string): Promise<EvaluationResult[]>;
  getEvaluationForAction(workflowName: string, runId: string, agentActionName: string, evaluatorName: string): Promise<EvaluationResult>;
  runEvaluationForAction(workflowName: string, runId: string, agentActionName: string, evaluatorName: string): Promise<EvaluationResult>;
}

let service: IEvaluationService;

export const InitEvaluationService = (evaluationService: IEvaluationService): void => {
  service = evaluationService;
};

export const EvaluationService = (): IEvaluationService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'EvaluationService needs to be initialized before using');
  }

  return service;
};
