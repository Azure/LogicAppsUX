import type { RootState } from '../../store';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useIsAgenticWorkflow } from '../designerView/designerViewSelectors';

export const useEvaluators = () => useSelector((state: RootState) => state.evaluation.evaluators);
export const useEvaluatorsLoading = () => useSelector((state: RootState) => state.evaluation.evaluatorsLoading);
export const useSelectedEvaluator = () => useSelector((state: RootState) => state.evaluation.selectedEvaluator);
export const useSelectedRun = () => useSelector((state: RootState) => state.evaluation.selectedRun);
export const useSelectedAction = () => useSelector((state: RootState) => state.evaluation.selectedAction);
export const useAgentActions = () => useSelector((state: RootState) => state.evaluation.agentActions);
export const useAgentActionsLoading = () => useSelector((state: RootState) => state.evaluation.agentActionsLoading);
export const useRightPanelView = () => useSelector((state: RootState) => state.evaluation.rightPanelView);
export const useEditingEvaluator = () => useSelector((state: RootState) => state.evaluation.editingEvaluator);
export const useEvaluationResult = () => useSelector((state: RootState) => state.evaluation.evaluationResult);
export const useEvaluationLoading = () => useSelector((state: RootState) => state.evaluation.evaluationLoading);
export const useEvaluationError = () => useSelector((state: RootState) => state.evaluation.evaluationError);
export const useRunningEvaluatorName = () => useSelector((state: RootState) => state.evaluation.runningEvaluatorName);
export const useSearchQuery = () => useSelector((state: RootState) => state.evaluation.searchQuery);

export const useFilteredEvaluators = () => {
  const evaluators = useEvaluators();
  const searchQuery = useSearchQuery();
  return useMemo(
    () =>
      evaluators.filter(
        (ev) => ev.name.toLowerCase().includes(searchQuery.toLowerCase()) || ev.template.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [evaluators, searchQuery]
  );
};

export const useCanRunEvaluation = () => {
  const selectedRun = useSelectedRun();
  const selectedAction = useSelectedAction();
  const isAgenticWorkflow = useIsAgenticWorkflow();

  return useMemo(() => {
    if (!selectedRun) {
      return false;
    }
    if (isAgenticWorkflow) {
      return !!selectedAction;
    }
    return true;
  }, [selectedRun, selectedAction, isAgenticWorkflow]);
};
