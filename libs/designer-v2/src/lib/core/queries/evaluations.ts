import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EvaluationService } from '@microsoft/logic-apps-shared';
import type { Evaluator } from '@microsoft/logic-apps-shared';

const queryOpts = {
  cacheTime: 1000 * 60 * 5,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const evaluationQueryKeys = {
  evaluators: 'evaluators',
  evaluator: 'evaluator',
  evaluationsForRun: 'evaluationsForRun',
  evaluation: 'evaluation',
  evaluationsForAction: 'evaluationsForAction',
  evaluationForAction: 'evaluationForAction',
};

export const useEvaluatorsQuery = (workflowName: string, enabled = true) => {
  return useQuery(
    [evaluationQueryKeys.evaluators, workflowName],
    async () => {
      return EvaluationService().getEvaluators(workflowName);
    },
    {
      ...queryOpts,
      enabled: enabled && !!workflowName.trim(),
    }
  );
};

export const useEvaluatorQuery = (workflowName: string, evaluatorName: string, enabled = true) => {
  return useQuery(
    [evaluationQueryKeys.evaluator, workflowName, evaluatorName],
    async () => {
      return EvaluationService().getEvaluator(workflowName, evaluatorName);
    },
    {
      ...queryOpts,
      enabled: enabled && !!workflowName.trim() && !!evaluatorName.trim(),
    }
  );
};

export const useCreateOrUpdateEvaluator = (workflowName: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ evaluatorName, evaluator }: { evaluatorName: string; evaluator: Evaluator }) => {
      return EvaluationService().createOrUpdateEvaluator(workflowName, evaluatorName, evaluator);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([evaluationQueryKeys.evaluators, workflowName]);
      },
    }
  );
};

export const useDeleteEvaluator = (workflowName: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async (evaluatorName: string) => {
      return EvaluationService().deleteEvaluator(workflowName, evaluatorName);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([evaluationQueryKeys.evaluators, workflowName]);
      },
    }
  );
};

export const useEvaluationsForRun = (workflowName: string, runId: string, enabled = true) => {
  return useQuery(
    [evaluationQueryKeys.evaluationsForRun, workflowName, runId],
    async () => {
      return EvaluationService().getEvaluationsForRun(workflowName, runId);
    },
    {
      ...queryOpts,
      enabled: enabled && !!workflowName.trim() && !!runId.trim(),
    }
  );
};

export const useEvaluationQuery = (workflowName: string, runId: string, evaluatorName: string, enabled = true) => {
  return useQuery(
    [evaluationQueryKeys.evaluation, workflowName, runId, evaluatorName],
    async () => {
      return EvaluationService().getEvaluation(workflowName, runId, evaluatorName);
    },
    {
      ...queryOpts,
      enabled: enabled && !!workflowName.trim() && !!runId.trim() && !!evaluatorName.trim(),
    }
  );
};

export const useEvaluationForActionQuery = (
  workflowName: string,
  runId: string,
  agentActionName: string,
  evaluatorName: string,
  enabled = true
) => {
  return useQuery(
    [evaluationQueryKeys.evaluationForAction, workflowName, runId, agentActionName, evaluatorName],
    async () => {
      return EvaluationService().getEvaluationForAction(workflowName, runId, agentActionName, evaluatorName);
    },
    {
      ...queryOpts,
      enabled: enabled && !!workflowName.trim() && !!runId.trim() && !!agentActionName.trim() && !!evaluatorName.trim(),
    }
  );
};

export const useRunEvaluation = (workflowName: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ runId, evaluatorName }: { runId: string; evaluatorName: string }) => {
      return EvaluationService().runEvaluation(workflowName, runId, evaluatorName);
    },
    {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries([evaluationQueryKeys.evaluationsForRun, workflowName, variables.runId]);
        queryClient.invalidateQueries([evaluationQueryKeys.evaluation, workflowName, variables.runId, variables.evaluatorName]);
      },
    }
  );
};

export const useRunEvaluationForAction = (workflowName: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ runId, agentActionName, evaluatorName }: { runId: string; agentActionName: string; evaluatorName: string }) => {
      return EvaluationService().runEvaluationForAction(workflowName, runId, agentActionName, evaluatorName);
    },
    {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries([evaluationQueryKeys.evaluationsForAction, workflowName, variables.runId, variables.agentActionName]);
        queryClient.invalidateQueries([
          evaluationQueryKeys.evaluationForAction,
          workflowName,
          variables.runId,
          variables.agentActionName,
          variables.evaluatorName,
        ]);
      },
    }
  );
};
