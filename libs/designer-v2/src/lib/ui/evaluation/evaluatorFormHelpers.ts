import type { EvaluatorTemplate, ComparisonMethod, Evaluator, EvaluatorParameters } from '@microsoft/logic-apps-shared';

export interface ToolCallFormItem {
  name: string;
  arguments: string;
}

export interface EvaluatorFormData {
  name: string;
  template: EvaluatorTemplate;
  connectionReferenceKey: string;
  deploymentId: string;
  agentModelType: string;
  modelName: string;
  prompt: string;
  expectedToolCalls: ToolCallFormItem[];
  threshold: string;
  comparisonMethod: ComparisonMethod;
  shouldCompareArgs: boolean;
  expectedChatResponse: string;
  useGroundTruthRun: boolean;
  groundTruthRunId: string;
  groundTruthAgentActionName: string;
}

export const createDefaultToolCallFormItem = (): ToolCallFormItem => ({
  name: '',
  arguments: '{}',
});

export const createDefaultEvaluatorFormData = (): EvaluatorFormData => ({
  name: '',
  template: 'CustomPrompt',
  connectionReferenceKey: '',
  deploymentId: '',
  agentModelType: '',
  modelName: '',
  prompt: '',
  expectedToolCalls: [],
  threshold: '',
  comparisonMethod: 'exact',
  shouldCompareArgs: false,
  expectedChatResponse: '',
  useGroundTruthRun: false,
  groundTruthRunId: '',
  groundTruthAgentActionName: '',
});

export const formDataToEvaluator = (formData: EvaluatorFormData): Evaluator => {
  const parameters: EvaluatorParameters = {};

  switch (formData.template) {
    case 'CustomPrompt':
      parameters.prompt = formData.prompt;
      break;
    case 'ToolCallTrajectory': {
      if (!formData.useGroundTruthRun) {
        parameters.expectedToolCalls = formData.expectedToolCalls
          .filter((tc) => tc.name.trim().length > 0)
          .map((tc, index) => ({
            name: tc.name.trim(),
            arguments: JSON.parse(tc.arguments || '{}'),
            callId: String(index),
          }));
      }
      if (formData.threshold) {
        parameters.threshold = Number.parseFloat(formData.threshold);
      }
      if (formData.comparisonMethod) {
        parameters.comparisonMethod = formData.comparisonMethod;
      }
      parameters.shouldCompareArgs = formData.shouldCompareArgs;
      break;
    }
    case 'SemanticSimilarity': {
      if (!formData.useGroundTruthRun) {
        parameters.expectedChatResponse = formData.expectedChatResponse;
      }
      break;
    }
  }

  const baseEvaluator: Evaluator = {
    name: formData.name,
    template: formData.template,
    parameters,
  };

  if (formData.useGroundTruthRun && formData.groundTruthRunId) {
    baseEvaluator.groundTruthRunId = formData.groundTruthRunId;
    if (formData.groundTruthAgentActionName) {
      baseEvaluator.groundTruthAgentActionName = formData.groundTruthAgentActionName;
    }
  }

  if (formData.template === 'ToolCallTrajectory') {
    return baseEvaluator;
  }

  return {
    ...baseEvaluator,
    deploymentId: formData.deploymentId || undefined,
    agentModelType: formData.agentModelType || undefined,
    agentModelSettings: formData.modelName
      ? {
          deploymentModelProperties: {
            name: formData.modelName,
          },
        }
      : undefined,
    modelConfiguration: formData.connectionReferenceKey
      ? {
          referenceName: formData.connectionReferenceKey,
        }
      : undefined,
  };
};

export const evaluatorToFormData = (evaluator: Evaluator): EvaluatorFormData => {
  const useGroundTruthRun = !!evaluator.groundTruthRunId;

  return {
    name: evaluator.name,
    template: evaluator.template,
    connectionReferenceKey: evaluator.modelConfiguration?.referenceName ?? '',
    deploymentId: evaluator.deploymentId ?? '',
    agentModelType: evaluator.agentModelType ?? '',
    modelName: evaluator.agentModelSettings?.deploymentModelProperties.name ?? '',
    prompt: evaluator.parameters.prompt ?? '',
    expectedToolCalls:
      evaluator.parameters.expectedToolCalls?.map((tc) => ({
        name: tc.name,
        arguments: JSON.stringify(tc.arguments, null, 2),
      })) ?? [],
    threshold: evaluator.parameters.threshold?.toString() ?? '',
    comparisonMethod: evaluator.parameters.comparisonMethod ?? 'exact',
    shouldCompareArgs: evaluator.parameters.shouldCompareArgs ?? false,
    expectedChatResponse: evaluator.parameters.expectedChatResponse ?? '',
    useGroundTruthRun,
    groundTruthRunId: evaluator.groundTruthRunId ?? '',
    groundTruthAgentActionName: evaluator.groundTruthAgentActionName ?? '',
  };
};
