import { projectOverviewMessages } from './messages';
import { useProjectOverviewStyles } from './styles';
import { Button, Link, Tooltip, mergeClasses } from '@fluentui/react-components';
import { CopyRegular, HistoryRegular, OpenRegular } from '@fluentui/react-icons';
import type { ProjectOverviewWorkflow, ProjectOverviewWorkflowId } from '@microsoft/vscode-extension-logic-apps';
import { ProjectOverviewCallbackAvailability, ProjectOverviewLatestRunAvailability } from '@microsoft/vscode-extension-logic-apps';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export const ProjectOverviewSortColumn = {
  Workflow: 'workflow',
  RuntimeUrl: 'runtimeUrl',
  LastRun: 'lastRun',
} as const;
export type ProjectOverviewSortColumn = (typeof ProjectOverviewSortColumn)[keyof typeof ProjectOverviewSortColumn];

export const ProjectOverviewSortDirection = {
  Ascending: 'ascending',
  Descending: 'descending',
} as const;
export type ProjectOverviewSortDirection = (typeof ProjectOverviewSortDirection)[keyof typeof ProjectOverviewSortDirection];

export interface ProjectOverviewSort {
  column: ProjectOverviewSortColumn;
  direction: ProjectOverviewSortDirection;
}

// Lower ranks sort first. Unknown host statuses remain deterministic after the documented common statuses.
export const LAST_RUN_STATUS_RANK = [
  'running',
  'waiting',
  'succeeded',
  'failed',
  'cancelled',
  'canceled',
  'timedout',
  'aborted',
  'skipped',
] as const;

const getRuntimeUrl = (workflow: ProjectOverviewWorkflow): string | undefined =>
  workflow.callback.availability === ProjectOverviewCallbackAvailability.Available ? workflow.callback.url : undefined;

const getRun = (workflow: ProjectOverviewWorkflow) =>
  workflow.latestRun.availability === ProjectOverviewLatestRunAvailability.Available ? workflow.latestRun.run : undefined;

const comparePresentValues = <T,>(left: T | undefined, right: T | undefined, compare: (a: T, b: T) => number): number => {
  if (left === undefined && right === undefined) {
    return 0;
  }
  if (left === undefined) {
    return 1;
  }
  if (right === undefined) {
    return -1;
  }
  return compare(left, right);
};

export const sortProjectOverviewWorkflows = (
  workflows: ProjectOverviewWorkflow[],
  sort: ProjectOverviewSort,
  collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
): ProjectOverviewWorkflow[] => {
  const statusRank = (status: string): number => {
    const rank = LAST_RUN_STATUS_RANK.indexOf(status.toLocaleLowerCase() as (typeof LAST_RUN_STATUS_RANK)[number]);
    return rank < 0 ? LAST_RUN_STATUS_RANK.length : rank;
  };

  const compareRows = (left: ProjectOverviewWorkflow, right: ProjectOverviewWorkflow): number => {
    switch (sort.column) {
      case ProjectOverviewSortColumn.Workflow:
        return collator.compare(left.name, right.name);
      case ProjectOverviewSortColumn.RuntimeUrl:
        return comparePresentValues(getRuntimeUrl(left), getRuntimeUrl(right), collator.compare);
      case ProjectOverviewSortColumn.LastRun: {
        const leftRun = getRun(left);
        const rightRun = getRun(right);
        return comparePresentValues(leftRun, rightRun, (a, b) => statusRank(a.status) - statusRank(b.status));
      }
    }
  };

  return workflows
    .map((workflow, index) => ({ workflow, index }))
    .sort((left, right) => {
      const comparison = compareRows(left.workflow, right.workflow);
      if (comparison === 0) {
        return left.index - right.index;
      }

      const leftMissing =
        (sort.column === ProjectOverviewSortColumn.RuntimeUrl && getRuntimeUrl(left.workflow) === undefined) ||
        (sort.column === ProjectOverviewSortColumn.LastRun && getRun(left.workflow) === undefined);
      const rightMissing =
        (sort.column === ProjectOverviewSortColumn.RuntimeUrl && getRuntimeUrl(right.workflow) === undefined) ||
        (sort.column === ProjectOverviewSortColumn.LastRun && getRun(right.workflow) === undefined);

      if (leftMissing !== rightMissing) {
        return leftMissing ? 1 : -1;
      }
      return sort.direction === ProjectOverviewSortDirection.Ascending ? comparison : -comparison;
    })
    .map(({ workflow }) => workflow);
};

interface ProjectOverviewTableProps {
  workflows: ProjectOverviewWorkflow[];
  onCopyCallback: (workflowId: ProjectOverviewWorkflowId) => void;
  onOpenLatestRun: (workflow: ProjectOverviewWorkflow) => void;
  onOpenWorkflow: (workflowId: ProjectOverviewWorkflowId) => void;
}

export const ProjectOverviewTable = ({ workflows, onCopyCallback, onOpenLatestRun, onOpenWorkflow }: ProjectOverviewTableProps) => {
  const styles = useProjectOverviewStyles();
  const intl = useIntl();
  const [sort, setSort] = useState<ProjectOverviewSort>({
    column: ProjectOverviewSortColumn.Workflow,
    direction: ProjectOverviewSortDirection.Ascending,
  });
  const sortedWorkflows = useMemo(() => sortProjectOverviewWorkflows(workflows, sort), [sort, workflows]);

  const columns: { column: ProjectOverviewSortColumn; label: string }[] = [
    { column: ProjectOverviewSortColumn.Workflow, label: intl.formatMessage(projectOverviewMessages.WORKFLOW) },
    { column: ProjectOverviewSortColumn.RuntimeUrl, label: intl.formatMessage(projectOverviewMessages.RUNTIME_URL) },
    { column: ProjectOverviewSortColumn.LastRun, label: intl.formatMessage(projectOverviewMessages.LAST_RUN) },
  ];

  const toggleSort = (column: ProjectOverviewSortColumn) => {
    setSort((current) => ({
      column,
      direction:
        current.column === column && current.direction === ProjectOverviewSortDirection.Ascending
          ? ProjectOverviewSortDirection.Descending
          : ProjectOverviewSortDirection.Ascending,
    }));
  };

  const runUnavailableText = (workflow: ProjectOverviewWorkflow): string => {
    switch (workflow.latestRun.availability) {
      case ProjectOverviewLatestRunAvailability.NoRuns:
        return intl.formatMessage(projectOverviewMessages.NO_RUNS);
      case ProjectOverviewLatestRunAvailability.StatelessHistoryUnavailable:
        return intl.formatMessage(projectOverviewMessages.RUN_HISTORY_UNAVAILABLE);
      case ProjectOverviewLatestRunAvailability.RuntimeUnavailable:
        return intl.formatMessage(projectOverviewMessages.RUNTIME_UNAVAILABLE);
      case ProjectOverviewLatestRunAvailability.QueryFailed:
        return intl.formatMessage(projectOverviewMessages.QUERY_FAILED);
      default:
        return '';
    }
  };

  const callbackUnavailableText = (workflow: ProjectOverviewWorkflow): string => {
    switch (workflow.callback.availability) {
      case ProjectOverviewCallbackAvailability.RuntimeUnavailable:
        return intl.formatMessage(projectOverviewMessages.RUNTIME_UNAVAILABLE);
      case ProjectOverviewCallbackAvailability.QueryFailed:
        return intl.formatMessage(projectOverviewMessages.QUERY_FAILED);
      default:
        return intl.formatMessage(projectOverviewMessages.CALLBACK_UNAVAILABLE);
    }
  };

  const runStatus = (workflow: ProjectOverviewWorkflow): { text: string; tone: 'success' | 'danger' | 'running' | 'neutral' } => {
    const run = getRun(workflow);
    if (!run) {
      return { text: runUnavailableText(workflow), tone: 'neutral' };
    }

    switch (run.status.toLocaleLowerCase()) {
      case 'succeeded':
      case 'success':
        return { text: run.status, tone: 'success' };
      case 'failed':
        return { text: run.status, tone: 'danger' };
      case 'running':
        return { text: run.status, tone: 'running' };
      default:
        return { text: run.status, tone: 'neutral' };
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map(({ column, label }) => {
              const active = sort.column === column;
              const nextDirection =
                active && sort.direction === ProjectOverviewSortDirection.Ascending
                  ? ProjectOverviewSortDirection.Descending
                  : ProjectOverviewSortDirection.Ascending;
              return (
                <th aria-sort={active ? sort.direction : 'none'} className={styles.headerCell} key={column} scope="col">
                  <Button
                    appearance="transparent"
                    className={styles.sortButton}
                    onClick={() => toggleSort(column)}
                    aria-label={intl.formatMessage(
                      nextDirection === ProjectOverviewSortDirection.Ascending
                        ? projectOverviewMessages.SORT_ASCENDING
                        : projectOverviewMessages.SORT_DESCENDING,
                      { column: label }
                    )}
                  >
                    {label}
                  </Button>
                </th>
              );
            })}
            <th className={styles.headerCell} scope="col">
              <div className={styles.columnLabel}>{intl.formatMessage(projectOverviewMessages.ACTIONS)}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedWorkflows.map((workflow) => {
            const run = getRun(workflow);
            const status = runStatus(workflow);
            const runtimeUrl = getRuntimeUrl(workflow);
            return (
              <tr key={workflow.workflowId}>
                <th className={styles.cell} scope="row">
                  <div className={styles.workflowName}>{workflow.name}</div>
                  <div className={styles.secondary}>{workflow.errors.map((error) => error.message).join(' ')}</div>
                </th>
                <td className={styles.cell}>
                  {runtimeUrl ? (
                    <div className={styles.cellActions}>
                      <Link className={styles.url} href={runtimeUrl} target="_blank">
                        {runtimeUrl}
                      </Link>
                      <Tooltip
                        content={intl.formatMessage(projectOverviewMessages.COPY_CALLBACK, { workflowName: workflow.name })}
                        relationship="label"
                      >
                        <Button
                          appearance="subtle"
                          aria-label={intl.formatMessage(projectOverviewMessages.COPY_CALLBACK, { workflowName: workflow.name })}
                          icon={<CopyRegular />}
                          onClick={() => onCopyCallback(workflow.workflowId)}
                        />
                      </Tooltip>
                    </div>
                  ) : (
                    callbackUnavailableText(workflow)
                  )}
                </td>
                <td className={styles.cell}>
                  <span
                    aria-label={intl.formatMessage(projectOverviewMessages.LAST_RUN_STATUS, {
                      status: status.text,
                      workflowName: workflow.name,
                    })}
                    className={mergeClasses(
                      styles.statusPill,
                      status.tone === 'success' && styles.statusSuccess,
                      status.tone === 'danger' && styles.statusDanger,
                      status.tone === 'running' && styles.statusRunning,
                      status.tone === 'neutral' && styles.statusNeutral,
                      `project-overview-status--${status.tone}`
                    )}
                  >
                    {status.text}
                  </span>
                </td>
                <td className={styles.cell}>
                  <div className={styles.cellActions}>
                    {run ? (
                      <Tooltip
                        content={intl.formatMessage(projectOverviewMessages.OPEN_LATEST_RUN, { workflowName: workflow.name })}
                        relationship="label"
                      >
                        <Button
                          appearance="subtle"
                          aria-label={intl.formatMessage(projectOverviewMessages.OPEN_LATEST_RUN, { workflowName: workflow.name })}
                          icon={<HistoryRegular />}
                          onClick={() => onOpenLatestRun(workflow)}
                        />
                      </Tooltip>
                    ) : null}
                    <Tooltip
                      content={intl.formatMessage(projectOverviewMessages.OPEN_WORKFLOW, { workflowName: workflow.name })}
                      relationship="label"
                    >
                      <Button
                        appearance="subtle"
                        aria-label={intl.formatMessage(projectOverviewMessages.OPEN_WORKFLOW, { workflowName: workflow.name })}
                        icon={<OpenRegular />}
                        onClick={() => onOpenWorkflow(workflow.workflowId)}
                      />
                    </Tooltip>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
