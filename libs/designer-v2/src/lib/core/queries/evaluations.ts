import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EvaluationService } from '@microsoft/logic-apps-shared';
import type { Evaluator } from '@microsoft/logic-apps-shared';
import { useIsAgenticWorkflow } from '../state/designerView/designerViewSelectors';

const queryOpts = {
  cacheTime: 1000 * 60 * 5,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const evaluationQueryKeys = {
  evaluators: 'evaluators',
  evaluator: 'evaluator',
  evaluations: 'evaluations',
  evaluation: 'evaluation',
};

export const useEvaluators = (workflowName: string, agentActionName: string) => {
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const globalAgentEvaluators = useGlobalAgentEvaluators(workflowName, !isAgenticWorkflow);
  const agentEvaluators = useAgentEvaluators(workflowName, agentActionName, isAgenticWorkflow);
  return isAgenticWorkflow ? agentEvaluators : globalAgentEvaluators;
};

const useGlobalAgentEvaluators = (workflowName: string, isEnabled: boolean) => {
  return useQuery(
    [evaluationQueryKeys.evaluators, workflowName],
    async () => {
      return EvaluationService().getGlobalAgentEvaluators(workflowName);
    },
    {
      ...queryOpts,
      enabled: isEnabled && !!workflowName.trim(),
    }
  );
};

const useAgentEvaluators = (workflowName: string, agentActionName: string, isEnabled: boolean) => {
  return useQuery(
    [evaluationQueryKeys.evaluators, workflowName, agentActionName],
    async () => {
      return EvaluationService().getAgentEvaluators(workflowName, agentActionName);
    },
    {
      ...queryOpts,
      enabled: isEnabled && !!workflowName.trim() && !!agentActionName.trim(),
    }
  );
};

export const useEvaluator = (workflowName: string, agentActionName: string, evaluatorName: string) => {
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const globalAgentEvaluator = useGlobalAgentEvaluator(workflowName, evaluatorName, !isAgenticWorkflow);
  const agentEvaluator = useAgentEvaluator(workflowName, agentActionName, evaluatorName, isAgenticWorkflow);
  return isAgenticWorkflow ? agentEvaluator : globalAgentEvaluator;
};

const useGlobalAgentEvaluator = (workflowName: string, evaluatorName: string, isEnabled: boolean) => {
  return useQuery(
    [evaluationQueryKeys.evaluator, workflowName, evaluatorName],
    async () => {
      return EvaluationService().getGlobalAgentEvaluator(workflowName, evaluatorName);
    },
    {
      ...queryOpts,
      enabled: isEnabled && !!workflowName.trim() && !!evaluatorName.trim(),
    }
  );
};

const useAgentEvaluator = (workflowName: string, agentActionName: string, evaluatorName: string, isEnabled: boolean) => {
  return useQuery(
    [evaluationQueryKeys.evaluator, workflowName, agentActionName, evaluatorName],
    async () => {
      return EvaluationService().getAgentEvaluator(workflowName, agentActionName, evaluatorName);
    },
    {
      ...queryOpts,
      enabled: isEnabled && !!workflowName.trim() && !!agentActionName.trim() && !!evaluatorName.trim(),
    }
  );
};

export const useCreateOrUpdateEvaluator = (workflowName: string, agentActionName: string) => {
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const createOrUpdateGlobalAgentEvaluator = useCreateOrUpdateGlobalAgentEvaluator(workflowName);
  const createOrUpdateAgentEvaluator = useCreateOrUpdateAgentEvaluator(workflowName, agentActionName);
  return isAgenticWorkflow ? createOrUpdateAgentEvaluator : createOrUpdateGlobalAgentEvaluator;
};

const useCreateOrUpdateGlobalAgentEvaluator = (workflowName: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ evaluatorName, evaluator }: { evaluatorName: string; evaluator: Evaluator }) => {
      return EvaluationService().createOrUpdateGlobalAgentEvaluator(workflowName, evaluatorName, evaluator);
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries([evaluationQueryKeys.evaluators, workflowName]);
        queryClient.invalidateQueries([evaluationQueryKeys.evaluator, workflowName, variables.evaluatorName]);
      },
    }
  );
};

const useCreateOrUpdateAgentEvaluator = (workflowName: string, agentActionName: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ evaluatorName, evaluator }: { evaluatorName: string; evaluator: Evaluator }) => {
      return EvaluationService().createOrUpdateAgentEvaluator(workflowName, agentActionName, evaluatorName, evaluator);
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries([evaluationQueryKeys.evaluators, workflowName, agentActionName]);
        queryClient.invalidateQueries([evaluationQueryKeys.evaluator, workflowName, agentActionName, variables.evaluatorName]);
      },
    }
  );
};

export const useDeleteEvaluator = (workflowName: string, agentActionName: string) => {
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const deleteGlobalAgentEvaluator = useDeleteGlobalAgentEvaluator(workflowName);
  const deleteAgentEvaluator = useDeleteAgentEvaluator(workflowName, agentActionName);
  return isAgenticWorkflow ? deleteAgentEvaluator : deleteGlobalAgentEvaluator;
};

const useDeleteGlobalAgentEvaluator = (workflowName: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async (evaluatorName: string) => {
      return EvaluationService().deleteGlobalAgentEvaluator(workflowName, evaluatorName);
    },
    {
      onSuccess: (data, evaluatorName) => {
        queryClient.invalidateQueries([evaluationQueryKeys.evaluators, workflowName]);
        queryClient.invalidateQueries([evaluationQueryKeys.evaluator, workflowName, evaluatorName]);
      },
    }
  );
};

const useDeleteAgentEvaluator = (workflowName: string, agentActionName: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async (evaluatorName: string) => {
      return EvaluationService().deleteAgentEvaluator(workflowName, agentActionName, evaluatorName);
    },
    {
      onSuccess: (data, evaluatorName) => {
        queryClient.invalidateQueries([evaluationQueryKeys.evaluators, workflowName, agentActionName]);
        queryClient.invalidateQueries([evaluationQueryKeys.evaluator, workflowName, agentActionName, evaluatorName]);
      },
    }
  );
};

export const useEvaluations = (workflowName: string, runId: string, agentActionName: string) => {
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const globalAgentEvaluations = useGlobalAgentEvaluations(workflowName, runId, !isAgenticWorkflow);
  const agentEvaluations = useAgentEvaluations(workflowName, runId, agentActionName, isAgenticWorkflow);
  return isAgenticWorkflow ? agentEvaluations : globalAgentEvaluations;
};

const useGlobalAgentEvaluations = (workflowName: string, runId: string, isEnabled: boolean) => {
  return useQuery(
    [evaluationQueryKeys.evaluations, workflowName, runId],
    async () => {
      return EvaluationService().getGlobalAgentEvaluations(workflowName, runId);
    },
    {
      ...queryOpts,
      enabled: isEnabled && !!workflowName.trim() && !!runId.trim(),
    }
  );
};

const useAgentEvaluations = (workflowName: string, runId: string, agentActionName: string, isEnabled: boolean) => {
  return useQuery(
    [evaluationQueryKeys.evaluations, workflowName, runId, agentActionName],
    async () => {
      return EvaluationService().getAgentEvaluations(workflowName, runId, agentActionName);
    },
    {
      ...queryOpts,
      enabled: isEnabled && !!workflowName.trim() && !!runId.trim() && !!agentActionName.trim(),
    }
  );
};

export const useEvaluation = (workflowName: string, runId: string, agentActionName: string, evaluatorName: string) => {
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const globalAgentEvaluation = useGlobalAgentEvaluation(workflowName, runId, evaluatorName, !isAgenticWorkflow);
  const agentEvaluation = useAgentEvaluation(workflowName, runId, agentActionName, evaluatorName, isAgenticWorkflow);
  return isAgenticWorkflow ? agentEvaluation : globalAgentEvaluation;
};

const useGlobalAgentEvaluation = (workflowName: string, runId: string, evaluatorName: string, isEnabled: boolean) => {
  return useQuery(
    [evaluationQueryKeys.evaluation, workflowName, runId, evaluatorName],
    async () => {
      return EvaluationService().getGlobalAgentEvaluation(workflowName, runId, evaluatorName);
    },
    {
      ...queryOpts,
      retry: (_count, error: any) => error?.response?.status !== 404,
      enabled: isEnabled && !!workflowName.trim() && !!runId.trim() && !!evaluatorName.trim(),
    }
  );
};

const useAgentEvaluation = (workflowName: string, runId: string, agentActionName: string, evaluatorName: string, isEnabled: boolean) => {
  return useQuery(
    [evaluationQueryKeys.evaluation, workflowName, runId, agentActionName, evaluatorName],
    async () => {
      return EvaluationService().getAgentEvaluation(workflowName, runId, agentActionName, evaluatorName);
    },
    {
      ...queryOpts,
      retry: (_count, error: any) => error?.response?.status !== 404,
      enabled: isEnabled && !!workflowName.trim() && !!runId.trim() && !!agentActionName.trim() && !!evaluatorName.trim(),
    }
  );
};

export const useRunEvaluation = (workflowName: string, agentActionName: string) => {
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const runGlobalAgentEvaluation = useRunGlobalAgentEvaluation(workflowName);
  const runAgentEvaluation = useRunAgentEvaluation(workflowName, agentActionName);
  return isAgenticWorkflow ? runAgentEvaluation : runGlobalAgentEvaluation;
};

const useRunGlobalAgentEvaluation = (workflowName: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ runId, evaluatorName }: { runId: string; evaluatorName: string }) => {
      return EvaluationService().runGlobalAgentEvaluation(workflowName, runId, evaluatorName);
    },
    {
      onMutate: (variables) => {
        queryClient.setQueryData([evaluationQueryKeys.evaluation, workflowName, variables.runId, variables.evaluatorName], undefined);
        queryClient.setQueryData([evaluationQueryKeys.evaluations, workflowName, variables.runId], (oldData: any) => {
          return oldData?.filter((evaluationResult: any) => evaluationResult.evaluatorName !== variables.evaluatorName) ?? [];
        });
      },
      onSuccess: (data, variables) => {
        queryClient.setQueryData([evaluationQueryKeys.evaluation, workflowName, variables.runId, variables.evaluatorName], data);
        queryClient.setQueryData([evaluationQueryKeys.evaluations, workflowName, variables.runId], (oldData: any) => {
          return [...(oldData ?? []), data];
        });
      },
    }
  );
};

const useRunAgentEvaluation = (workflowName: string, agentActionName: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ runId, evaluatorName }: { runId: string; evaluatorName: string }) => {
      return EvaluationService().runAgentEvaluation(workflowName, runId, agentActionName, evaluatorName);
    },
    {
      onMutate: (variables) => {
        queryClient.setQueryData(
          [evaluationQueryKeys.evaluation, workflowName, variables.runId, agentActionName, variables.evaluatorName],
          undefined
        );
        queryClient.setQueryData([evaluationQueryKeys.evaluations, workflowName, variables.runId, agentActionName], (oldData: any) => {
          return oldData?.filter((evaluationResult: any) => evaluationResult.evaluatorName !== variables.evaluatorName) ?? [];
        });
      },
      onSuccess: (data, variables) => {
        queryClient.setQueryData(
          [evaluationQueryKeys.evaluation, workflowName, variables.runId, agentActionName, variables.evaluatorName],
          data
        );
        queryClient.setQueryData([evaluationQueryKeys.evaluations, workflowName, variables.runId, agentActionName], (oldData: any) => {
          return [...(oldData ?? []), data];
        });
      },
    }
  );
};
