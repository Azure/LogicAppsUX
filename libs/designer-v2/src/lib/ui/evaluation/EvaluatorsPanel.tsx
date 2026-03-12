import { useCallback, useEffect } from 'react';
import { Button, Input, mergeClasses, Spinner, Tooltip } from '@fluentui/react-components';
import { AddRegular, EditRegular, PlayRegular, DeleteRegular } from '@fluentui/react-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  setEvaluators,
  setEvaluatorsLoading,
  setSelectedEvaluator,
  startCreateEvaluator,
  startEditEvaluator,
  setSearchQuery,
  setRightPanelView,
  setEvaluationLoading,
  setEvaluationError,
  setEvaluationResult,
  setRunningEvaluatorName,
} from '../../core/state/evaluation/evaluationSlice';
import {
  useFilteredEvaluators,
  useEvaluatorsLoading,
  useSelectedEvaluator,
  useSearchQuery,
  useCanRunEvaluation,
  useSelectedRun,
  useSelectedAction,
} from '../../core/state/evaluation/evaluationSelectors';
import { useEvaluatorsQuery, useRunEvaluation, useRunEvaluationForAction, useDeleteEvaluator } from '../../core/queries/evaluations';
import type { Evaluator } from '@microsoft/logic-apps-shared';
import { useEvaluateViewStyles } from './EvaluateView.styles';
import type { RootState } from '../../core/store';

interface EvaluatorsPanelProps {
  workflowName: string;
}

export const EvaluatorsPanel = ({ workflowName }: EvaluatorsPanelProps) => {
  const styles = useEvaluateViewStyles();
  const dispatch = useDispatch();
  const filteredEvaluators = useFilteredEvaluators();
  const evaluatorsLoading = useEvaluatorsLoading();
  const selectedEvaluator = useSelectedEvaluator();
  const searchQuery = useSearchQuery();
  const canRun = useCanRunEvaluation();
  const selectedRun = useSelectedRun();
  const selectedAction = useSelectedAction();
  const workflowKind = useSelector((state: RootState) => state.workflow.workflowKind);

  const { data, isLoading } = useEvaluatorsQuery(workflowName);
  const runEvaluation = useRunEvaluation(workflowName);
  const runEvaluationForAction = useRunEvaluationForAction(workflowName);
  const deleteEvaluator = useDeleteEvaluator(workflowName);

  useEffect(() => {
    dispatch(setEvaluatorsLoading(isLoading));
    if (data) {
      dispatch(setEvaluators(Array.isArray(data) ? data : []));
    }
  }, [data, isLoading, dispatch]);

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
      dispatch(setEvaluationLoading(true));
      dispatch(setEvaluationError(null));
      dispatch(setEvaluationResult(null));
      dispatch(setRunningEvaluatorName(evaluator.name));

      try {
        const isStateful = workflowKind === 'stateful' || workflowKind === 'agentic';
        if (isStateful && selectedAction) {
          const result = await runEvaluationForAction.mutateAsync({
            runId: selectedRun.id,
            agentActionName: selectedAction.name,
            evaluatorName: evaluator.name,
          });
          dispatch(setEvaluationResult(result));
        } else {
          const result = await runEvaluation.mutateAsync({
            runId: selectedRun.id,
            evaluatorName: evaluator.name,
          });
          dispatch(setEvaluationResult(result));
        }
      } catch (err) {
        dispatch(setEvaluationError(err instanceof Error ? err.message : 'Failed to run evaluation'));
      } finally {
        dispatch(setEvaluationLoading(false));
      }
    },
    [dispatch, selectedRun, selectedAction, workflowKind, runEvaluation, runEvaluationForAction]
  );

  const handleDeleteClick = useCallback(
    async (evaluator: Evaluator) => {
      try {
        await deleteEvaluator.mutateAsync(evaluator.name);
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
        <div className={styles.colActions} />
      </div>

      {evaluatorsLoading || isLoading ? (
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
