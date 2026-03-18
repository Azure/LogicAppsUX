import type { RootState } from '../../store';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useIsAgenticWorkflow } from '../designerView/designerViewSelectors';
import type { Evaluator } from '@microsoft/logic-apps-shared';

export const useSelectedRun = () => useSelector((state: RootState) => state.evaluation.selectedRun);
export const useSelectedAction = () => useSelector((state: RootState) => state.evaluation.selectedAction);
export const useSelectedEvaluator = () => useSelector((state: RootState) => state.evaluation.selectedEvaluator);
export const useAgentActions = () => useSelector((state: RootState) => state.evaluation.agentActions);
export const useAgentActionsLoading = () => useSelector((state: RootState) => state.evaluation.agentActionsLoading);
export const useRightPanelView = () => useSelector((state: RootState) => state.evaluation.rightPanelView);
export const useRunningEvaluatorName = () => useSelector((state: RootState) => state.evaluation.runningEvaluatorName);
export const useSearchQuery = () => useSelector((state: RootState) => state.evaluation.searchQuery);

export const useFilteredEvaluators = (evaluators: Evaluator[]) => {
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
