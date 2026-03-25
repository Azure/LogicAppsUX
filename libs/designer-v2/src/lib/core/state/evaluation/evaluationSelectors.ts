import type { RootState } from '../../store';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useIsAgenticWorkflow } from '../designerView/designerViewSelectors';
import type { Evaluator } from '@microsoft/logic-apps-shared';
import { useRunInstance } from '../workflow/workflowSelectors';

export const useSelectedEvaluationAgentName = () => useSelector((state: RootState) => state.evaluation.selectedAgentName);
export const useSelectedEvaluator = () => useSelector((state: RootState) => state.evaluation.selectedEvaluator);
export const useEvaluationViewMode = () => useSelector((state: RootState) => state.evaluation.viewMode);
export const useRunningEvaluatorName = () => useSelector((state: RootState) => state.evaluation.runningEvaluatorName);
export const useEvaluatorSearchQuery = () => useSelector((state: RootState) => state.evaluation.evaluatorSearchQuery);
export const usePendingFormData = () => useSelector((state: RootState) => state.evaluation.pendingFormData);

export const useFilteredEvaluators = (evaluators: Evaluator[]) => {
  const evaluatorSearchQuery = useEvaluatorSearchQuery();
  return useMemo(
    () =>
      evaluators.filter(
        (ev) =>
          ev.name.toLowerCase().includes(evaluatorSearchQuery.toLowerCase()) ||
          ev.template.toLowerCase().includes(evaluatorSearchQuery.toLowerCase())
      ),
    [evaluators, evaluatorSearchQuery]
  );
};

export const useEvaluationDataSelected = () => {
  const selectedRun = useRunInstance();
  const selectedAgentName = useSelectedEvaluationAgentName();
  const isAgenticWorkflow = useIsAgenticWorkflow();

  return useMemo(() => {
    if (!selectedRun) {
      return false;
    }
    if (isAgenticWorkflow) {
      return !!selectedAgentName;
    }
    return true;
  }, [selectedRun, selectedAgentName, isAgenticWorkflow]);
};
