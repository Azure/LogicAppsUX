import { QueryKeys } from '../../run-service';
import type { RunDisplayItem } from '../../run-service';
import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { Overview, isRunError, mapToRunItem } from '@microsoft/designer-ui';
import { type Runs, StandardRunService, Theme, equals, isRuntimeUp } from '@microsoft/logic-apps-shared';
import { ExtensionCommand, HttpClient } from '@microsoft/vscode-extension-logic-apps';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useIntlMessages, overviewMessages } from '../../intl';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import invariant from 'tiny-invariant';
import { useOverviewStyles } from './overviewStyles';
import { getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import { fetchAgentUrl } from './services/workflowService';

export interface CallbackInfo {
  method?: string;
  value: string;
}
export const OverviewApp = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const vscode = useContext(VSCodeContext);
  const { apiVersion, baseUrl, accessToken, workflowProperties, hostVersion, azureDetails, kind, connectionData } = workflowState;
  const [theme, setTheme] = useState<Theme>(getTheme(document.body));
  const styles = useOverviewStyles();

  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });

  const isAgentWorkflow = useMemo(() => {
    return equals(kind, 'agent', true);
  }, [kind]);

  const [isWorkflowRuntimeRunning, setIsWorkflowRuntimeRunning] = useState(true);
  useEffect(() => {
    const pingRuntimeApi = async () => {
      setIsWorkflowRuntimeRunning(await isRuntimeUp(baseUrl));
    };

    pingRuntimeApi();
    const interval = setInterval(async () => {
      pingRuntimeApi();
    }, 5000);

    return () => clearInterval(interval);
  }, [baseUrl]);

  const clientId = azureDetails?.clientId ?? '';
  const tenantId = azureDetails?.tenantId ?? '';
  const azureSubscriptionId = azureDetails?.subscriptionId ?? '';
  const resourceGroupName = azureDetails?.resourceGroupName ?? '';

  const intlText = useIntlMessages(overviewMessages);

  const httpClient = useMemo(() => {
    return new HttpClient({
      accessToken: accessToken,
      baseUrl: baseUrl,
      apiHubBaseUrl: '',
      hostVersion: hostVersion,
    });
  }, [accessToken, baseUrl, hostVersion]);

  const runService = useMemo(() => {
    return new StandardRunService({
      baseUrl: baseUrl,
      apiVersion: apiVersion,
      workflowName: workflowProperties.name,
      httpClient,
    });
  }, [baseUrl, apiVersion, workflowProperties.name, httpClient]);

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

  const { isLoading: agentUrlIsLoading, data: agentUrlData } = useQuery(
    ['agentUrl', isWorkflowRuntimeRunning, baseUrl],
    async () => {
      return fetchAgentUrl(
        workflowProperties.name,
        baseUrl,
        httpClient,
        clientId,
        tenantId,
        connectionData,
        azureSubscriptionId,
        resourceGroupName
      );
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: isWorkflowRuntimeRunning && isAgentWorkflow,
    }
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
    <div className={styles.overviewContainer}>
      <Overview
        corsNotice={workflowState.corsNotice}
        errorMessage={errorMessage}
        hasMoreRuns={hasNextPage}
        loading={isLoading || runTriggerLoading}
        isDarkMode={theme === Theme.Dark}
        isAgentWorkflow={isAgentWorkflow}
        agentUrlLoading={agentUrlIsLoading}
        agentUrlData={agentUrlData}
        isWorkflowRuntimeRunning={isWorkflowRuntimeRunning}
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
        onCreateUnitTestFromRun={(run: RunDisplayItem) => {
          vscode.postMessage({
            command: ExtensionCommand.createUnitTestFromRun,
            runId: run.id,
          });
        }}
      />
    </div>
  );
};
