export type EvaluatorTemplate = 'CustomPrompt' | 'ToolCallTrajectory' | 'SemanticSimilarity';

export type ComparisonMethod = 'exact' | 'in-order' | 'any-order' | 'precision' | 'recall';

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  callId: string;
}

export interface EvaluatorParameters {
  prompt?: string;
  expectedToolCalls?: ToolCall[];
  threshold?: number;
  comparisonMethod?: ComparisonMethod;
  shouldCompareArgs?: boolean;
  expectedChatResponse?: string;
}

export interface DeploymentModelProperties {
  name: string;
}

export interface AgentModelSettings {
  deploymentModelProperties: DeploymentModelProperties;
}

export interface ModelConfiguration {
  referenceName: string;
}

export interface Evaluator {
  name: string;
  template: EvaluatorTemplate;
  deploymentId?: string;
  agentModelType?: string;
  parameters: EvaluatorParameters;
  agentModelSettings?: AgentModelSettings;
  modelConfiguration?: ModelConfiguration;
  groundTruthRunId?: string;
  groundTruthAgentActionName?: string;
}

export interface EvaluationResult {
  agentActionName?: string;
  evaluatorName: string;
  result: string;
  value: string;
  reason: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}
