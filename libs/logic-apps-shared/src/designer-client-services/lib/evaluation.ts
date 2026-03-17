import { AssertionException, AssertionErrorCode } from '../../utils/src';
import type { Evaluator, EvaluationResult } from '../../utils/src/lib/models/evaluation';

export interface IEvaluationService {
  // Evaluator management (A2A workflows)
  getGlobalAgentEvaluators(workflowName: string): Promise<Evaluator[]>;
  getGlobalAgentEvaluator(workflowName: string, evaluatorName: string): Promise<Evaluator>;
  createOrUpdateGlobalAgentEvaluator(workflowName: string, evaluatorName: string, evaluator: Evaluator): Promise<Evaluator>;
  deleteGlobalAgentEvaluator(workflowName: string, evaluatorName: string): Promise<void>;

  // Evaluator management (Agentic workflows)
  getAgentEvaluators(workflowName: string, agentActionName: string): Promise<Evaluator[]>;
  getAgentEvaluator(workflowName: string, agentActionName: string, evaluatorName: string): Promise<Evaluator>;
  createOrUpdateAgentEvaluator(
    workflowName: string,
    agentActionName: string,
    evaluatorName: string,
    evaluator: Evaluator
  ): Promise<Evaluator>;
  deleteAgentEvaluator(workflowName: string, agentActionName: string, evaluatorName: string): Promise<void>;

  // Evaluations (A2A workflows)
  getGlobalAgentEvaluations(workflowName: string, runId: string): Promise<EvaluationResult[]>;
  getGlobalAgentEvaluation(workflowName: string, runId: string, evaluatorName: string): Promise<EvaluationResult>;
  runGlobalAgentEvaluation(workflowName: string, runId: string, evaluatorName: string): Promise<EvaluationResult>;

  // Evaluations (Agentic workflows)
  getAgentEvaluations(workflowName: string, runId: string, agentActionName: string): Promise<EvaluationResult[]>;
  getAgentEvaluation(workflowName: string, runId: string, agentActionName: string, evaluatorName: string): Promise<EvaluationResult>;
  runAgentEvaluation(workflowName: string, runId: string, agentActionName: string, evaluatorName: string): Promise<EvaluationResult>;
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
