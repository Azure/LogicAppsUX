import { EvaluatorTemplate, ToolCallComparisonMethod, type Evaluator, type EvaluatorParameters } from '@microsoft/logic-apps-shared';

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
  comparisonMethod: ToolCallComparisonMethod;
  shouldCompareArgs: boolean;
  expectedChatResponse: string;
  useGroundTruthRun: boolean;
  groundTruthRunId: string;
  groundTruthAgentActionName: string;
}

export const isModelAsJudgeEvaluator = (template: EvaluatorTemplate): boolean =>
  template === EvaluatorTemplate.CustomPrompt || template === EvaluatorTemplate.SemanticSimilarity;

export const isGroundTruthEvaluator = (template: EvaluatorTemplate): boolean =>
  template === EvaluatorTemplate.ToolCallTrajectory || template === EvaluatorTemplate.SemanticSimilarity;

export const createDefaultToolCallFormItem = (): ToolCallFormItem => ({
  name: '',
  arguments: '{}',
});

export const createDefaultEvaluatorFormData = (): EvaluatorFormData => ({
  name: '',
  template: EvaluatorTemplate.CustomPrompt,
  connectionReferenceKey: '',
  deploymentId: '',
  agentModelType: '',
  modelName: '',
  prompt: '',
  expectedToolCalls: [],
  threshold: '',
  comparisonMethod: ToolCallComparisonMethod.Exact,
  shouldCompareArgs: false,
  expectedChatResponse: '',
  useGroundTruthRun: false,
  groundTruthRunId: '',
  groundTruthAgentActionName: '',
});

export const formDataToEvaluator = (formData: EvaluatorFormData): Evaluator => {
  const parameters: EvaluatorParameters = {};

  switch (formData.template) {
    case EvaluatorTemplate.CustomPrompt:
      parameters.prompt = formData.prompt;
      break;
    case EvaluatorTemplate.ToolCallTrajectory: {
      if (!formData.useGroundTruthRun) {
        parameters.expectedToolCalls = formData.expectedToolCalls
          .filter((tc) => tc.name.trim().length > 0)
          .map((tc) => ({
            name: tc.name.trim(),
            arguments: JSON.parse(tc.arguments || '{}'),
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
    case EvaluatorTemplate.SemanticSimilarity: {
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

  if (formData.template === EvaluatorTemplate.ToolCallTrajectory) {
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
    comparisonMethod: evaluator.parameters.comparisonMethod ?? ToolCallComparisonMethod.Exact,
    shouldCompareArgs: evaluator.parameters.shouldCompareArgs ?? false,
    expectedChatResponse: evaluator.parameters.expectedChatResponse ?? '',
    useGroundTruthRun,
    groundTruthRunId: evaluator.groundTruthRunId ?? '',
    groundTruthAgentActionName: evaluator.groundTruthAgentActionName ?? '',
  };
};
