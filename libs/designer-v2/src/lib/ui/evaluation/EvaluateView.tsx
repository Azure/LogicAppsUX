import { mergeClasses, Text } from '@fluentui/react-components';
import { useDispatch } from 'react-redux';
import { useSelectedEvaluator, useRightPanelView } from '../../core/state/evaluation/evaluationSelectors';
import { startEditEvaluator, setSelectedEvaluator } from '../../core/state/evaluation/evaluationSlice';
import { useDeleteEvaluator } from '../../core/queries/evaluations';
import { EvaluatorManagementPanel } from './EvaluatorManagementPanel';
import { EvaluatorFormPanel } from './EvaluatorFormPanel';
import { EvaluatorDetailsPanel } from './EvaluatorDetailsPanel';
import { EvaluationResultPanel } from './EvaluationResultPanel';
import { useEvaluateViewStyles } from './EvaluateView.styles';
import { useCallback } from 'react';
import { RunHistoryPanel } from '../panel';

interface EvaluateViewProps {
  workflowName: string;
}

export const EvaluateView = ({ workflowName }: EvaluateViewProps) => {
  const styles = useEvaluateViewStyles();
  const dispatch = useDispatch();
  const selectedEvaluator = useSelectedEvaluator();
  const rightPanelView = useRightPanelView();

  const { mutateAsync: deleteEvaluator } = useDeleteEvaluator(workflowName, '');

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
            onDelete={handleDeleteClick}
          />
        ) : null;
      case 'result':
        return <EvaluationResultPanel workflowName={workflowName} />;
      default:
        return (
          <div className={styles.emptyState}>
            <Text size={300} weight="semibold">
              Select an action to get started
            </Text>
            <Text size={200}>Create a new evaluator or select one to view</Text>
          </div>
        );
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.main}>
        <RunHistoryPanel />
        <EvaluatorManagementPanel workflowName={workflowName} />
        <div className={mergeClasses(styles.panel, styles.panelDetail)}>{renderRightPanel()}</div>
      </div>
    </div>
  );
};
