import { ProjectOverviewTable } from './projectOverviewTable';
import { projectOverviewMessages } from './messages';
import { useProjectOverviewStyles } from './styles';
import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { Button, Field, Input, Spinner, Tooltip } from '@fluentui/react-components';
import { ArrowClockwiseRegular, PlayRegular, StopRegular } from '@fluentui/react-icons';
import {
  ExtensionCommand,
  ProjectOverviewLatestRunAvailability,
  ProjectOverviewLifecycle,
  type ProjectOverviewMessageToExtension,
  type ProjectOverviewRunId,
  ProjectOverviewRuntimeState,
  type ProjectOverviewVisibilityPayload,
  type ProjectOverviewWorkflow,
  type ProjectOverviewWorkflowId,
} from '@microsoft/vscode-extension-logic-apps';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const ProjectOverviewApp = () => {
  const { initialized, snapshot } = useSelector((state: RootState) => state.projectOverview);
  const vscode = useContext(VSCodeContext);
  const intl = useIntl();
  const styles = useProjectOverviewStyles();
  const [filter, setFilter] = useState('');
  const [isStoppingRuntime, setIsStoppingRuntime] = useState(false);
  const pendingCancellationRunIdsRef = useRef(new Set<ProjectOverviewRunId>());
  const [pendingCancellations, setPendingCancellations] = useState<ReadonlyMap<ProjectOverviewRunId, number>>(new Map());

  const postMessage = useCallback(
    (message: ProjectOverviewMessageToExtension) => {
      vscode.postMessage(message);
    },
    [vscode]
  );

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const notifyVisibility = () => {
      const message = {
        command: ExtensionCommand.projectOverviewVisibilityChanged,
        data: {
          projectId: snapshot.projectId,
          visible: document.visibilityState === 'visible',
        } satisfies ProjectOverviewVisibilityPayload,
      };
      vscode.postMessage(message);
    };

    document.addEventListener('visibilitychange', notifyVisibility);
    return () => document.removeEventListener('visibilitychange', notifyVisibility);
  }, [snapshot, vscode]);

  useEffect(() => {
    setIsStoppingRuntime(false);
  }, [snapshot?.generation, snapshot?.runtime.generation, snapshot?.runtime.state]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    setPendingCancellations((current) => {
      let changed = false;
      const next = new Map(current);

      for (const [runId, requestedGeneration] of current) {
        if (snapshot.generation <= requestedGeneration) {
          continue;
        }

        const runStillRunning = snapshot.workflows.some(
          (workflow) =>
            workflow.latestRun.availability === ProjectOverviewLatestRunAvailability.Available &&
            workflow.latestRun.run.runId === runId &&
            workflow.latestRun.run.status.toLocaleLowerCase() === 'running'
        );
        if (!runStillRunning) {
          next.delete(runId);
          pendingCancellationRunIdsRef.current.delete(runId);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [snapshot]);

  const filteredWorkflows = useMemo(() => {
    const normalizedFilter = filter.trim().toLocaleLowerCase();
    if (!normalizedFilter || !snapshot) {
      return snapshot?.workflows ?? [];
    }
    return snapshot.workflows.filter((workflow) => workflow.name.toLocaleLowerCase().includes(normalizedFilter));
  }, [filter, snapshot]);

  if (!initialized || !snapshot) {
    return (
      <main className={styles.root}>
        <div aria-live="polite" className={styles.centered} role="status">
          <Spinner label={intl.formatMessage(projectOverviewMessages.LOADING)} />
        </div>
      </main>
    );
  }

  const actionData = {
    projectId: snapshot.projectId,
    snapshotGeneration: snapshot.generation,
  };
  const refresh = () => postMessage({ command: ExtensionCommand.refreshProjectOverview, data: actionData });
  const retry = () => postMessage({ command: ExtensionCommand.retryProjectOverview, data: actionData });
  const startRuntime = () => postMessage({ command: ExtensionCommand.startProjectOverviewRuntime, data: actionData });
  const stopRuntime = () => {
    setIsStoppingRuntime(true);
    postMessage({ command: ExtensionCommand.stopProjectOverviewRuntime, data: actionData });
  };
  const openWorkflow = (workflowId: ProjectOverviewWorkflowId) =>
    postMessage({ command: ExtensionCommand.openWorkflowOverview, data: { ...actionData, workflowId } });
  const copyCallback = (workflowId: ProjectOverviewWorkflowId) =>
    postMessage({ command: ExtensionCommand.copyProjectOverviewCallback, data: { ...actionData, workflowId } });
  const openLatestRun = (workflow: ProjectOverviewWorkflow) => {
    if (workflow.latestRun.availability === ProjectOverviewLatestRunAvailability.Available) {
      postMessage({
        command: ExtensionCommand.openLatestProjectOverviewRun,
        data: { ...actionData, workflowId: workflow.workflowId, runId: workflow.latestRun.run.runId },
      });
    }
  };
  const cancelLatestRun = (workflow: ProjectOverviewWorkflow) => {
    if (
      workflow.latestRun.availability !== ProjectOverviewLatestRunAvailability.Available ||
      workflow.latestRun.run.status.toLocaleLowerCase() !== 'running'
    ) {
      return;
    }

    const runId = workflow.latestRun.run.runId;
    if (pendingCancellationRunIdsRef.current.has(runId)) {
      return;
    }

    pendingCancellationRunIdsRef.current.add(runId);
    setPendingCancellations((current) => new Map(current).set(runId, snapshot.generation));
    postMessage({
      command: ExtensionCommand.cancelProjectOverviewRun,
      data: { ...actionData, workflowId: workflow.workflowId, runId },
    });
  };

  if (snapshot.lifecycle === ProjectOverviewLifecycle.Error) {
    return (
      <main className={styles.root}>
        <div aria-live="assertive" className={styles.centered} role="alert">
          <h1>{intl.formatMessage(projectOverviewMessages.PROJECT_OVERVIEW)}</h1>
          <p>{snapshot.errors.map((error) => error.message).join(' ')}</p>
          <Button appearance="primary" onClick={retry}>
            {intl.formatMessage(projectOverviewMessages.RETRY)}
          </Button>
        </div>
      </main>
    );
  }

  const lifecycleAnnouncement =
    snapshot.lifecycle === ProjectOverviewLifecycle.Starting
      ? intl.formatMessage(projectOverviewMessages.LOADING)
      : snapshot.isRefreshing
        ? intl.formatMessage(projectOverviewMessages.REFRESHING)
        : snapshot.lifecycle === ProjectOverviewLifecycle.RuntimeStopped
          ? intl.formatMessage(projectOverviewMessages.RUNTIME_STOPPED)
          : snapshot.lifecycle === ProjectOverviewLifecycle.Partial
            ? intl.formatMessage(projectOverviewMessages.PARTIAL)
            : '';
  const runtimeStarting = snapshot.runtime.state === ProjectOverviewRuntimeState.Starting;
  const runtimeRunning = snapshot.runtime.state === ProjectOverviewRuntimeState.Running;
  const actionablePartialErrors = snapshot.errors.map((error) => error.message.trim()).filter(Boolean);
  const runtimeActionLabel = intl.formatMessage(
    runtimeStarting
      ? projectOverviewMessages.RUNTIME_STARTING
      : runtimeRunning
        ? projectOverviewMessages.STOP_RUNTIME
        : projectOverviewMessages.START_RUNTIME
  );

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>{snapshot.projectName}</h1>
        <div className={styles.actions}>
          <Tooltip content={runtimeActionLabel} relationship="label">
            <Button
              appearance="subtle"
              aria-label={runtimeActionLabel}
              disabled={runtimeStarting || isStoppingRuntime}
              icon={runtimeStarting ? <Spinner size="tiny" /> : runtimeRunning ? <StopRegular /> : <PlayRegular />}
              onClick={runtimeRunning ? stopRuntime : startRuntime}
              size="small"
            />
          </Tooltip>
          <Tooltip content={intl.formatMessage(projectOverviewMessages.REFRESH)} relationship="label">
            <Button
              appearance="subtle"
              aria-label={intl.formatMessage(projectOverviewMessages.REFRESH)}
              disabled={snapshot.isRefreshing}
              icon={snapshot.isRefreshing ? <Spinner size="tiny" /> : <ArrowClockwiseRegular />}
              onClick={refresh}
              size="small"
            />
          </Tooltip>
        </div>
      </header>

      <div
        aria-atomic="true"
        aria-live={snapshot.lifecycle === ProjectOverviewLifecycle.RuntimeStopped ? 'assertive' : 'polite'}
        className={styles.liveRegion}
        data-testid="project-overview-lifecycle-status"
        role="status"
      >
        {lifecycleAnnouncement}
      </div>

      {snapshot.lifecycle === ProjectOverviewLifecycle.Partial && actionablePartialErrors.length > 0 ? (
        <div className={styles.status}>
          {intl.formatMessage(projectOverviewMessages.PARTIAL)} {actionablePartialErrors.join(' ')}
        </div>
      ) : null}

      {snapshot.workflows.length === 0 && snapshot.lifecycle !== ProjectOverviewLifecycle.Starting ? (
        <section className={styles.centered}>
          <h2>{intl.formatMessage(projectOverviewMessages.EMPTY_TITLE)}</h2>
          <p>{intl.formatMessage(projectOverviewMessages.EMPTY_DESCRIPTION)}</p>
        </section>
      ) : (
        <>
          <Field className={styles.filter} label={intl.formatMessage(projectOverviewMessages.FILTER)}>
            <Input
              value={filter}
              placeholder={intl.formatMessage(projectOverviewMessages.FILTER_PLACEHOLDER)}
              onChange={(_, data) => setFilter(data.value)}
            />
          </Field>
          {filteredWorkflows.length === 0 ? (
            <p role="status">{intl.formatMessage(projectOverviewMessages.NO_MATCHES)}</p>
          ) : (
            <ProjectOverviewTable
              workflows={filteredWorkflows}
              pendingCancellationRunIds={new Set(pendingCancellations.keys())}
              onCancelLatestRun={cancelLatestRun}
              onCopyCallback={copyCallback}
              onOpenLatestRun={openLatestRun}
              onOpenWorkflow={openWorkflow}
            />
          )}
        </>
      )}
    </main>
  );
};
