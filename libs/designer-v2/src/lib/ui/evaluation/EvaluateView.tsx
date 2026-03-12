import { mergeClasses } from '@fluentui/react-components';
import { useDispatch, useSelector } from 'react-redux';
import {
  useSelectedEvaluator,
  useRightPanelView,
  useSelectedRun,
  useSelectedAction,
} from '../../core/state/evaluation/evaluationSelectors';
import {
  startEditEvaluator,
  setSelectedEvaluator,
  setRightPanelView,
  setEvaluationLoading,
  setEvaluationError,
  setEvaluationResult,
  setRunningEvaluatorName,
} from '../../core/state/evaluation/evaluationSlice';
import { useRunEvaluation, useRunEvaluationForAction, useDeleteEvaluator } from '../../core/queries/evaluations';
import type { RootState } from '../../core/store';
import { RunDatasetPanel } from './RunDatasetPanel';
import { EvaluatorsPanel } from './EvaluatorsPanel';
import { EvaluatorFormPanel } from './EvaluatorFormPanel';
import { EvaluatorViewPanel } from './EvaluatorViewPanel';
import { EvaluationResultPanel } from './EvaluationResultPanel';
import { useEvaluateViewStyles } from './EvaluateView.styles';
import { useCallback } from 'react';

interface EvaluateViewProps {
  workflowName: string;
}

export const EvaluateView = ({ workflowName }: EvaluateViewProps) => {
  const styles = useEvaluateViewStyles();
  const dispatch = useDispatch();
  const selectedEvaluator = useSelectedEvaluator();
  const rightPanelView = useRightPanelView();
  const selectedRun = useSelectedRun();
  const selectedAction = useSelectedAction();
  const workflowKind = useSelector((state: RootState) => state.workflow.workflowKind);

  const runEvaluation = useRunEvaluation(workflowName);
  const runEvaluationForAction = useRunEvaluationForAction(workflowName);
  const deleteEvaluator = useDeleteEvaluator(workflowName);

  const handleRunClick = useCallback(async () => {
    if (!selectedRun || !selectedEvaluator) {
      return;
    }

    dispatch(setRightPanelView('result'));
    dispatch(setEvaluationLoading(true));
    dispatch(setEvaluationError(null));
    dispatch(setEvaluationResult(null));
    dispatch(setRunningEvaluatorName(selectedEvaluator.name));

    try {
      const isStateful = workflowKind === 'stateful' || workflowKind === 'agentic';
      if (isStateful && selectedAction) {
        const result = await runEvaluationForAction.mutateAsync({
          runId: selectedRun.id,
          agentActionName: selectedAction.name,
          evaluatorName: selectedEvaluator.name,
        });
        dispatch(setEvaluationResult(result));
      } else {
        const result = await runEvaluation.mutateAsync({
          runId: selectedRun.id,
          evaluatorName: selectedEvaluator.name,
        });
        dispatch(setEvaluationResult(result));
      }
    } catch (err) {
      dispatch(setEvaluationError(err instanceof Error ? err.message : 'Failed to run evaluation'));
    } finally {
      dispatch(setEvaluationLoading(false));
    }
  }, [dispatch, selectedRun, selectedAction, selectedEvaluator, workflowKind, runEvaluation, runEvaluationForAction]);

  const handleDeleteClick = useCallback(async () => {
    if (!selectedEvaluator) {
      return;
    }
    try {
      await deleteEvaluator.mutateAsync(selectedEvaluator.name);
      dispatch(setSelectedEvaluator(null));
    } catch (err) {
      console.error('Failed to delete evaluator:', err);
    }
  }, [deleteEvaluator, dispatch, selectedEvaluator]);

  const renderRightPanel = () => {
    switch (rightPanelView) {
      case 'create':
      case 'edit':
        return <EvaluatorFormPanel workflowName={workflowName} />;
      case 'view':
        return selectedEvaluator ? (
          <EvaluatorViewPanel
            workflowName={workflowName}
            evaluator={selectedEvaluator}
            onEdit={() => dispatch(startEditEvaluator(selectedEvaluator))}
            onRun={handleRunClick}
            onDelete={handleDeleteClick}
          />
        ) : null;
      case 'result':
        return <EvaluationResultPanel />;
      default:
        return (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Select an action to get started</p>
            <p className={styles.emptySubtext}>Create a new evaluator or select one to view</p>
          </div>
        );
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.main}>
        <RunDatasetPanel />
        <EvaluatorsPanel workflowName={workflowName} />
        <div className={mergeClasses(styles.panel, styles.panelDetail)}>{renderRightPanel()}</div>
      </div>
    </div>
  );
};
