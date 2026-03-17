import type { IHttpClient } from '../httpClient';
import type { IEvaluationService } from '../evaluation';
import type { Evaluator, EvaluationResult } from '../../../utils/src/lib/models/evaluation';
import { validateRequiredServiceArguments } from '../../../utils/src';

export interface EvaluationServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
}

export class StandardEvaluationService implements IEvaluationService {
  constructor(public readonly options: EvaluationServiceOptions) {
    const { apiVersion, baseUrl } = options;
    validateRequiredServiceArguments({ apiVersion, baseUrl });
  }

  // Evaluator management (A2A workflows)
  async getGlobalAgentEvaluators(workflowName: string): Promise<Evaluator[]> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/evaluators?api-version=${apiVersion}`;
    const response = await httpClient.get<{ value: Evaluator[] }>({ uri });
    return response.value;
  }

  async getGlobalAgentEvaluator(workflowName: string, evaluatorName: string): Promise<Evaluator> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/evaluators/${evaluatorName}?api-version=${apiVersion}`;
    return httpClient.get<Evaluator>({ uri });
  }

  async createOrUpdateGlobalAgentEvaluator(workflowName: string, evaluatorName: string, evaluator: Evaluator): Promise<Evaluator> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/evaluators/${evaluatorName}?api-version=${apiVersion}`;
    return httpClient.put<Evaluator, Evaluator>({ uri, content: evaluator });
  }

  async deleteGlobalAgentEvaluator(workflowName: string, evaluatorName: string): Promise<void> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/evaluators/${evaluatorName}?api-version=${apiVersion}`;
    await httpClient.delete<void>({ uri });
  }

  // Evaluator management (Agentic workflows)
  async getAgentEvaluators(workflowName: string, agentActionName: string): Promise<Evaluator[]> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/actions/${agentActionName}/evaluators?api-version=${apiVersion}`;
    const response = await httpClient.get<{ value: Evaluator[] }>({ uri });
    return response.value;
  }

  async getAgentEvaluator(workflowName: string, agentActionName: string, evaluatorName: string): Promise<Evaluator> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/actions/${agentActionName}/evaluators/${evaluatorName}?api-version=${apiVersion}`;
    return httpClient.get<Evaluator>({ uri });
  }

  async createOrUpdateAgentEvaluator(
    workflowName: string,
    agentActionName: string,
    evaluatorName: string,
    evaluator: Evaluator
  ): Promise<Evaluator> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/actions/${agentActionName}/evaluators/${evaluatorName}?api-version=${apiVersion}`;
    return httpClient.put<Evaluator, Evaluator>({ uri, content: evaluator });
  }

  async deleteAgentEvaluator(workflowName: string, agentActionName: string, evaluatorName: string): Promise<void> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/actions/${agentActionName}/evaluators/${evaluatorName}?api-version=${apiVersion}`;
    await httpClient.delete<void>({ uri });
  }

  // Evaluations (A2A workflows)
  async getGlobalAgentEvaluations(workflowName: string, runId: string): Promise<EvaluationResult[]> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/runs/${runId}/evaluators/runs/latest?api-version=${apiVersion}`;
    const response = await httpClient.get<{ value: EvaluationResult[] }>({ uri });
    return response.value;
  }

  async getGlobalAgentEvaluation(workflowName: string, runId: string, evaluatorName: string): Promise<EvaluationResult> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/runs/${runId}/evaluators/${evaluatorName}/runs/latest?api-version=${apiVersion}`;
    return httpClient.get<EvaluationResult>({ uri });
  }

  async runGlobalAgentEvaluation(workflowName: string, runId: string, evaluatorName: string): Promise<EvaluationResult> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/runs/${runId}/evaluators/${evaluatorName}/run?api-version=${apiVersion}`;
    return httpClient.post<any, EvaluationResult>({ uri });
  }

  // Evaluations (Agentic workflows)
  async getAgentEvaluations(workflowName: string, runId: string, agentActionName: string): Promise<EvaluationResult[]> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/runs/${runId}/actions/${agentActionName}/evaluators/runs/latest?api-version=${apiVersion}`;
    const response = await httpClient.get<{ value: EvaluationResult[] }>({ uri });
    return response.value;
  }

  async getAgentEvaluation(workflowName: string, runId: string, agentActionName: string, evaluatorName: string): Promise<EvaluationResult> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/runs/${runId}/actions/${agentActionName}/evaluators/${evaluatorName}/runs/latest?api-version=${apiVersion}`;
    return httpClient.get<EvaluationResult>({ uri });
  }

  async runAgentEvaluation(workflowName: string, runId: string, agentActionName: string, evaluatorName: string): Promise<EvaluationResult> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/workflows/${workflowName}/runs/${runId}/actions/${agentActionName}/evaluators/${evaluatorName}/run?api-version=${apiVersion}`;
    return httpClient.post<any, EvaluationResult>({ uri });
  }
}
