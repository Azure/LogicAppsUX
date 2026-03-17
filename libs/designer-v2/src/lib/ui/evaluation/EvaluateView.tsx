import { mergeClasses } from '@fluentui/react-components';
import { useDispatch } from 'react-redux';
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
import { useRunEvaluation, useDeleteEvaluator } from '../../core/queries/evaluations';
import { RunDatasetPanel } from './RunDatasetPanel';
import { EvaluatorManagementPanel } from './EvaluatorManagementPanel';
import { EvaluatorFormPanel } from './EvaluatorFormPanel';
import { EvaluatorDetailsPanel } from './EvaluatorDetailsPanel';
import { EvaluationResultPanel } from './EvaluationResultPanel';
import { AgentChatPanel } from './AgentChatPanel';
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

  const { mutateAsync: runEvaluation } = useRunEvaluation(workflowName, selectedAction?.name ?? '');
  const { mutateAsync: deleteEvaluator } = useDeleteEvaluator(workflowName, selectedAction?.name ?? '');

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
      const result = await runEvaluation({
        runId: selectedRun.name,
        evaluatorName: selectedEvaluator.name,
      });
      dispatch(setEvaluationResult(result));
    } catch (err) {
      dispatch(setEvaluationError(err instanceof Error ? err.message : 'Failed to run evaluation'));
    } finally {
      dispatch(setEvaluationLoading(false));
    }
  }, [dispatch, selectedRun, selectedEvaluator, runEvaluation]);

  const handleDeleteClick = useCallback(async () => {
    if (!selectedEvaluator) {
      return;
    }
    try {
      await deleteEvaluator(selectedEvaluator.name);
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
          <EvaluatorDetailsPanel
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
        <EvaluatorManagementPanel workflowName={workflowName} />
        <div className={mergeClasses(styles.panel, styles.panelDetail)}>{renderRightPanel()}</div>
        {selectedRun && (
          <div className={styles.panelChat}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Chat History</h2>
            </div>
            <AgentChatPanel />
          </div>
        )}
      </div>
    </div>
  );
};
