import { useCallback, useMemo } from 'react';
import { Button, Input, mergeClasses, Spinner, Tooltip } from '@fluentui/react-components';
import { AddRegular, EditRegular, PlayRegular, DeleteRegular } from '@fluentui/react-icons';
import { useDispatch } from 'react-redux';
import {
  setSelectedEvaluator,
  startCreateEvaluator,
  startEditEvaluator,
  setSearchQuery,
  setRightPanelView,
  setRunningEvaluatorName,
} from '../../core/state/evaluation/evaluationSlice';
import {
  useFilteredEvaluators,
  useSelectedEvaluator,
  useSearchQuery,
  useCanRunEvaluation,
  useSelectedRun,
  useSelectedAction,
} from '../../core/state/evaluation/evaluationSelectors';
import { useEvaluators, useRunEvaluation, useDeleteEvaluator, useEvaluations } from '../../core/queries/evaluations';
import type { Evaluator, EvaluationResult } from '@microsoft/logic-apps-shared';
import { useEvaluateViewStyles } from './EvaluateView.styles';

interface EvaluatorManagementPanelProps {
  workflowName: string;
}

export const EvaluatorManagementPanel = ({ workflowName }: EvaluatorManagementPanelProps) => {
  const styles = useEvaluateViewStyles();
  const dispatch = useDispatch();
  const selectedEvaluator = useSelectedEvaluator();
  const searchQuery = useSearchQuery();
  const canRun = useCanRunEvaluation();
  const selectedRun = useSelectedRun();
  const selectedAction = useSelectedAction();

  const { data: evaluators, isFetching: isEvaluatorsFetching } = useEvaluators(workflowName, selectedAction?.name ?? '');
  const { mutateAsync: deleteEvaluator } = useDeleteEvaluator(workflowName, selectedAction?.name ?? '');
  const { mutateAsync: runEvaluation } = useRunEvaluation(workflowName, selectedAction?.name ?? '');
  const { data: evaluations } = useEvaluations(workflowName, selectedRun?.name ?? '', selectedAction?.name ?? '');

  const evaluatorsList = useMemo(() => (Array.isArray(evaluators) ? evaluators : []), [evaluators]);
  const filteredEvaluators = useFilteredEvaluators(evaluatorsList);

  const evaluationsByName = useMemo(() => {
    const map = new Map<string, EvaluationResult>();
    if (evaluations) {
      for (const result of evaluations) {
        if (result.evaluatorName) {
          map.set(result.evaluatorName, result);
        }
      }
    }
    return map;
  }, [evaluations]);

  const handleSelectEvaluator = useCallback(
    (evaluator: Evaluator) => {
      dispatch(setSelectedEvaluator(selectedEvaluator?.name === evaluator.name ? null : evaluator));
    },
    [dispatch, selectedEvaluator]
  );

  const handleRunClick = useCallback(
    async (evaluator: Evaluator) => {
      if (!selectedRun) {
        return;
      }
      dispatch(setRightPanelView('result'));
      dispatch(setRunningEvaluatorName(evaluator.name));
      await runEvaluation({
        runId: selectedRun.name,
        evaluatorName: evaluator.name,
      });
    },
    [dispatch, selectedRun, runEvaluation]
  );

  const handleDeleteClick = useCallback(
    async (evaluator: Evaluator) => {
      try {
        await deleteEvaluator(evaluator.name);
        if (selectedEvaluator?.name === evaluator.name) {
          dispatch(setSelectedEvaluator(null));
        }
      } catch (err) {
        console.error('Failed to delete evaluator:', err);
      }
    },
    [deleteEvaluator, dispatch, selectedEvaluator]
  );

  return (
    <div className={mergeClasses(styles.panel, styles.panelEvaluators)}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Evaluators</h2>
        <Button
          appearance="primary"
          icon={<AddRegular />}
          size="small"
          onClick={() => dispatch(startCreateEvaluator())}
          disabled={!workflowName.trim()}
        >
          Create
        </Button>
      </div>

      <div className={styles.searchContainer}>
        <Input
          placeholder="Search or filter items by..."
          value={searchQuery}
          onChange={(_e, data) => dispatch(setSearchQuery(data.value))}
          size="small"
          style={{ width: '100%' }}
        />
      </div>

      <div className={styles.tableHeader}>
        <div className={styles.colType}>Type</div>
        <div className={styles.colName}>Name</div>
        <div className={styles.colResult}>Result</div>
        <div className={styles.colActions} />
      </div>

      {isEvaluatorsFetching ? (
        <div className={styles.loadingContainer}>
          <Spinner size="small" label="Loading..." />
        </div>
      ) : workflowName.trim() ? (
        filteredEvaluators.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No evaluators yet</p>
            <p className={styles.emptySubtext}>Click Create to add your first evaluator</p>
          </div>
        ) : (
          <div className={styles.listContainer}>
            {filteredEvaluators.map((evaluator) => (
              <div
                key={evaluator.name}
                className={mergeClasses(styles.tableRow, selectedEvaluator?.name === evaluator.name && styles.tableRowSelected)}
                onClick={() => handleSelectEvaluator(evaluator)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectEvaluator(evaluator)}
              >
                <div className={styles.colType}>{evaluator.template}</div>
                <div className={styles.colName}>{evaluator.name}</div>
                <div className={styles.colResult}>
                  {(() => {
                    const result = evaluationsByName.get(evaluator.name);
                    if (!result) {
                      return <span style={{ color: 'var(--colorNeutralForeground3)' }}>—</span>;
                    }
                    const passed = result.result?.toLowerCase() === 'passed';
                    return <span className={passed ? styles.statusSucceeded : styles.statusFailed}>{passed ? 'Passed' : 'Failed'}</span>;
                  })()}
                </div>
                <div className={styles.colActions}>
                  <Tooltip content="Edit" relationship="label">
                    <Button
                      appearance="subtle"
                      icon={<EditRegular />}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(startEditEvaluator(evaluator));
                      }}
                    />
                  </Tooltip>
                  <Tooltip content={canRun ? 'Run evaluation' : 'Select a run first'} relationship="label">
                    <Button
                      appearance="subtle"
                      icon={<PlayRegular />}
                      size="small"
                      disabled={!canRun}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunClick(evaluator);
                      }}
                    />
                  </Tooltip>
                  <Tooltip content="Delete evaluator" relationship="label">
                    <Button
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(evaluator);
                      }}
                    />
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Enter a workflow name</p>
          <p className={styles.emptySubtext}>to view evaluators</p>
        </div>
      )}
    </div>
  );
};
