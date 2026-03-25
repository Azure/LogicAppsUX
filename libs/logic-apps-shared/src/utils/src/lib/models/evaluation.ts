export const EvaluatorTemplate = {
  CustomPrompt: 'CustomPrompt',
  ToolCallTrajectory: 'ToolCallTrajectory',
  SemanticSimilarity: 'SemanticSimilarity',
} as const;
export type EvaluatorTemplate = (typeof EvaluatorTemplate)[keyof typeof EvaluatorTemplate];

export const evaluatorTemplateDisplayMap: Record<EvaluatorTemplate, string> = {
  [EvaluatorTemplate.CustomPrompt]: 'Custom Prompt',
  [EvaluatorTemplate.ToolCallTrajectory]: 'Tool Call Trajectory',
  [EvaluatorTemplate.SemanticSimilarity]: 'Semantic Similarity',
};

export const ToolCallComparisonMethod = {
  Exact: 'exact',
  InOrder: 'in-order',
  AnyOrder: 'any-order',
  Precision: 'precision',
  Recall: 'recall',
} as const;
export type ToolCallComparisonMethod = (typeof ToolCallComparisonMethod)[keyof typeof ToolCallComparisonMethod];

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface EvaluatorParameters {
  prompt?: string;
  expectedToolCalls?: ToolCall[];
  threshold?: number;
  comparisonMethod?: ToolCallComparisonMethod;
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
