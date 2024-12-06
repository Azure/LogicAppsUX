import { QueryKeys } from '../../run-service';
import type { RunDisplayItem } from '../../run-service';
import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import './overview.less';
import { StandardRunService } from '@microsoft/logic-apps-shared';
import { Overview, isRunError, mapToRunItem } from '@microsoft/designer-ui';
import type { Runs } from '@microsoft/logic-apps-shared';
import { ExtensionCommand, HttpClient } from '@microsoft/vscode-extension-logic-apps';
import { useCallback, useContext, useMemo } from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import invariant from 'tiny-invariant';
import { useIntl } from 'react-intl';

export interface CallbackInfo {
  method?: string;
  value: string;
}
export const OverviewApp = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const vscode = useContext(VSCodeContext);
  const { isWorkflowRuntimeRunning } = workflowState;
  const intl = useIntl();

  const intlText = {
    DEBUG_PROJECT_ERROR: intl.formatMessage({
      defaultMessage: 'Please start the project by pressing F5 or run it through the Run and Debug view',
      id: 'e1gQAz',
      description: 'Debug logic app project error text',
    }),
  };

  const runService = useMemo(() => {
    const httpClient = new HttpClient({
      accessToken: workflowState.accessToken,
      baseUrl: workflowState.baseUrl,
      apiHubBaseUrl: '',
      hostVersion: workflowState.hostVersion,
    });

    return new StandardRunService({
      baseUrl: workflowState.baseUrl,
      apiVersion: workflowState.apiVersion,
      accessToken: workflowState.accessToken,
      workflowName: workflowState.workflowProperties.name,
      httpClient,
    });
  }, [
    workflowState.baseUrl,
    workflowState.apiVersion,
    workflowState.accessToken,
    workflowState.workflowProperties.name,
    workflowState.hostVersion,
  ]);

  const loadRuns = ({ pageParam }: { pageParam?: string }) => {
    if (pageParam) {
      return runService.getMoreRuns(pageParam);
    }
    return runService.getRuns();
  };

  const { data, error, isLoading, fetchNextPage, hasNextPage, refetch, isRefetching } = useInfiniteQuery<Runs>(
    [QueryKeys.runsData],
    loadRuns,
    {
      getNextPageParam: (lastPage) => lastPage.nextLink,
      refetchInterval: 5000, // 5 seconds refresh interval
      refetchIntervalInBackground: false, // It will automatically refetch when window is focused
      enabled: isWorkflowRuntimeRunning,
    }
  );

  const runItems = useMemo(
    () =>
      data?.pages?.reduce<RunDisplayItem[]>((acc, val) => {
        return acc.concat(val.runs.map(mapToRunItem));
      }, []),
    [data?.pages]
  );

  const {
    mutate: runTriggerCall,
    isLoading: runTriggerLoading,
    error: runTriggerError,
  } = useMutation(async () => {
    invariant(workflowState.workflowProperties.callbackInfo, 'Run Trigger should not be runable unless callbackInfo has information');
    await runService.runTrigger(workflowState.workflowProperties.callbackInfo as CallbackInfo);
    return refetch();
  });

  const onVerifyRunId = useCallback(
    (runId: string) => {
      return runService.getRun(runId);
    },
    [runService]
  );

  const errorMessage = useMemo((): string | undefined => {
    if (!isWorkflowRuntimeRunning) {
      return intlText.DEBUG_PROJECT_ERROR;
    }
    let loadingErrorMessage: string | undefined;
    let triggerErrorMessage: string | undefined;
    if (error instanceof Error) {
      loadingErrorMessage = error.message;
    } else if (isRunError(error)) {
      loadingErrorMessage = error.error.message;
    } else if (error) {
      loadingErrorMessage = String(error);
    }

    if (runTriggerError instanceof Error) {
      triggerErrorMessage = runTriggerError.message;
    } else if (isRunError(runTriggerError)) {
      triggerErrorMessage = runTriggerError.error.message;
    } else if (runTriggerError) {
      triggerErrorMessage = String(runTriggerError);
    }

    return loadingErrorMessage ?? triggerErrorMessage;
  }, [error, runTriggerError, isWorkflowRuntimeRunning, intlText.DEBUG_PROJECT_ERROR]);

  return (
    <div className="msla-overview">
      <Overview
        corsNotice={workflowState.corsNotice}
        errorMessage={errorMessage}
        hasMoreRuns={hasNextPage}
        loading={isLoading || runTriggerLoading}
        runItems={runItems ?? []}
        workflowProperties={workflowState.workflowProperties}
        isRefreshing={isRefetching}
        onLoadMoreRuns={fetchNextPage}
        onLoadRuns={refetch}
        onOpenRun={(run: RunDisplayItem) => {
          vscode.postMessage({
            command: ExtensionCommand.loadRun,
            item: run,
          });
        }}
        onRunTrigger={runTriggerCall}
        onVerifyRunId={onVerifyRunId}
        supportsUnitTest={workflowState.isLocal}
        onCreateUnitTest={(run: RunDisplayItem) => {
          vscode.postMessage({
            command: ExtensionCommand.createUnitTest,
            runId: run.id,
          });
        }}
      />
    </div>
  );
};
