import { useCallback, useEffect } from 'react';
import { Button, mergeClasses, Spinner } from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { useDispatch } from 'react-redux';
import { setSelectedRun, setSelectedAction, setAgentActions, setAgentActionsLoading } from '../../core/state/evaluation/evaluationSlice';
import {
  useSelectedRun,
  useSelectedAction,
  useAgentActions,
  useAgentActionsLoading,
} from '../../core/state/evaluation/evaluationSelectors';
import { useRunsInfiniteQuery, useAllRuns, useRun } from '../../core/queries/runs';
import type { WorkflowRunEntry, AgentAction } from '../../core/state/evaluation/evaluationInterfaces';
import { useEvaluateViewStyles } from './EvaluateView.styles';
import type { Run } from '@microsoft/logic-apps-shared';
import { useIsAgenticWorkflow } from '../../core/state/designerView/designerViewSelectors';
import { useAgentOperations } from '../../core/state/workflow/workflowSelectors';

const formatTimestamp = (isoString: string | undefined): string => {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const calculateDuration = (startTime: string | undefined, endTime: string | undefined): string => {
  if (!startTime || !endTime) {
    return '';
  }
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const durationMs = end - start;
  const seconds = (durationMs / 1000).toFixed(1);
  return `${seconds}s`;
};

const formatTime = (isoString: string | undefined): string => {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

const runToEntry = (run: Run): WorkflowRunEntry => ({
  id: run.id,
  name: run.name,
  startTime: typeof run.properties.startTime === 'string' ? run.properties.startTime : new Date(run.properties.startTime).toISOString(),
  endTime: run.properties.endTime
    ? typeof run.properties.endTime === 'string'
      ? run.properties.endTime
      : new Date(run.properties.endTime).toISOString()
    : '',
  status: run.properties.status,
});

export const RunDatasetPanel = () => {
  const styles = useEvaluateViewStyles();
  const dispatch = useDispatch();
  const selectedRun = useSelectedRun();
  const selectedAction = useSelectedAction();
  const agentActions = useAgentActions();
  const agentActionsLoading = useAgentActionsLoading();
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const agentOperations = useAgentOperations();

  const { isLoading: runsLoading, fetchNextPage, hasNextPage } = useRunsInfiniteQuery(true);
  const allRuns = useAllRuns();

  const { data: runData } = useRun(selectedRun?.id, !!selectedRun && isAgenticWorkflow);

  useEffect(() => {
    if (!selectedRun || !isAgenticWorkflow || agentOperations.length === 0) {
      dispatch(setAgentActions([]));
      return;
    }

    if (!runData) {
      dispatch(setAgentActionsLoading(true));
      return;
    }

    const actions = (runData.properties.actions ?? {}) as Record<string, { status?: string; startTime?: string; endTime?: string }>;
    dispatch(
      setAgentActions(
        agentOperations.map((nodeId) => {
          const actionData = actions[nodeId];
          return {
            name: nodeId,
            status: actionData?.status ?? '',
            startTime: actionData?.startTime ?? '',
            endTime: actionData?.endTime ?? '',
          };
        })
      )
    );
    dispatch(setAgentActionsLoading(false));
  }, [selectedRun, isAgenticWorkflow, agentOperations, runData, dispatch]);

  const handleRunClick = useCallback(
    (run: Run) => {
      const entry = runToEntry(run);
      if (selectedRun?.name === entry.name) {
        return;
      }
      dispatch(setSelectedRun(entry));
    },
    [dispatch, selectedRun]
  );

  const handleActionClick = useCallback(
    (action: AgentAction) => {
      dispatch(setSelectedAction(selectedAction?.name === action.name ? null : action));
    },
    [dispatch, selectedAction]
  );

  const handleBackClick = useCallback(() => {
    dispatch(setSelectedAction(null));
    dispatch(setSelectedRun(null));
  }, [dispatch]);

  // Agent actions sub-view for stateful/agentic workflows
  if (selectedRun && isAgenticWorkflow && agentActions.length > 0) {
    return (
      <div className={mergeClasses(styles.panel, styles.panelRuns)}>
        <div className={mergeClasses(styles.panelHeader, styles.panelHeaderWithBack)}>
          <Button appearance="subtle" icon={<ArrowLeftRegular />} onClick={handleBackClick} size="small">
            Run history
          </Button>
        </div>
        {agentActionsLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner size="small" label="Loading agent actions..." />
          </div>
        ) : (
          <div className={styles.listContainer}>
            {agentActions.map((action, index) => (
              <div
                key={action.name}
                className={mergeClasses(styles.actionItem, selectedAction?.name === action.name && styles.actionItemSelected)}
                onClick={() => handleActionClick(action)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleActionClick(action)}
              >
                <div className={styles.actionIndex}>{index + 1}</div>
                <div className={styles.actionDetails}>
                  <div className={styles.actionStatus}>
                    <span className={action.status === 'Succeeded' ? styles.statusSucceeded : styles.statusFailed}>●</span>
                    <span>{action.name}</span>
                  </div>
                  <div className={styles.actionTiming}>
                    {formatTime(action.startTime)} • {calculateDuration(action.startTime, action.endTime)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={mergeClasses(styles.panel, styles.panelRuns)}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Run Dataset</h2>
      </div>
      {runsLoading ? (
        <div className={styles.loadingContainer}>
          <Spinner size="small" label="Loading runs..." />
        </div>
      ) : allRuns.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No runs found</p>
        </div>
      ) : (
        <div className={styles.listContainer}>
          {allRuns.map((run) => {
            const id = run.name;
            return (
              <div
                key={id}
                className={mergeClasses(styles.listItem, selectedRun?.name === id && styles.listItemSelected)}
                onClick={() => handleRunClick(run)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleRunClick(run)}
              >
                <div className={styles.runName}>{run.name}</div>
                <div className={styles.runTiming}>
                  {formatTimestamp(run.properties.startTime as string)} •{' '}
                  {calculateDuration(run.properties.startTime as string, run.properties.endTime as string)}
                </div>
              </div>
            );
          })}
          {hasNextPage && (
            <div style={{ padding: '8px 16px' }}>
              <Button appearance="subtle" size="small" onClick={() => fetchNextPage()}>
                Load more runs
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
