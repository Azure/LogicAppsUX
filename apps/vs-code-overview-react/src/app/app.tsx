import type { OnErrorFn } from '@formatjs/intl';
import { Overview, OverviewPropertiesProps, isRunError } from '@microsoft/designer-ui';
import { useCallback, useMemo } from 'react';
import { IntlProvider } from 'react-intl';
import messages from '../../../../libs/services/intl/src/compiled-lang/strings.json';
import { QueryClient, QueryClientProvider, useInfiniteQuery, useMutation } from 'react-query';
import { mapToRunItem, RunDisplayItem, Runs } from '../run-service';
import { RunService } from '../run-service';
import invariant from 'tiny-invariant';

const queryClient = new QueryClient();

export interface AppProps {
  apiVersion: string;
  baseUrl: string;
  workflowProperties: OverviewPropertiesProps;
  corsNotice?: string;
  accessToken?: string;
  onOpenRun(run: RunDisplayItem): void;
}

export const App: React.FC<AppProps> = (props) => {
  const handleError: OnErrorFn = useCallback((err) => {
    if (err.code !== 'MISSING_TRANSLATION') {
      throw err;
    }
  }, []);

  return (
    <IntlProvider defaultLocale="en" locale="en-US" messages={messages} onError={handleError}>
      <QueryClientProvider client={queryClient}>
        <OverviewApp {...props} />
      </QueryClientProvider>
    </IntlProvider>
  );
};

const OverviewApp: React.FC<AppProps> = ({ workflowProperties, apiVersion, baseUrl, accessToken, onOpenRun, corsNotice }) => {
  const runService = useMemo(
    () =>
      new RunService({
        baseUrl,
        apiVersion,
        accessToken,
        workflowName: workflowProperties.name,
      }),
    [baseUrl, apiVersion, accessToken, workflowProperties.name]
  );

  const loadRuns = ({ pageParam }: { pageParam?: string }) => {
    if (pageParam) {
      return runService.getMoreRuns(pageParam);
    }
    return runService.getRuns(`workflows/${workflowProperties.name}`);
  };

  const { data, error, isLoading, fetchNextPage, hasNextPage, refetch, isRefetching } = useInfiniteQuery<Runs>('runsData', loadRuns, {
    getNextPageParam: (lastPage) => lastPage.nextLink,
    refetchInterval: 5000, // 5 seconds refresh interval
    refetchIntervalInBackground: false, // It will automatically refetch when window is focused
  });

  const runItems = useMemo(
    () =>
      data?.pages?.reduce<RunDisplayItem[]>((acc, val) => {
        acc = [...acc, ...val.runs.map(mapToRunItem)];
        return acc;
      }, []),
    [data?.pages]
  );

  const {
    mutate: runTriggerCall,
    isLoading: runTriggerLoading,
    error: runTriggerError,
  } = useMutation(async () => {
    invariant(workflowProperties.callbackInfo, 'Run Trigger should not be runable unless callbackInfo has information');
    await runService.runTrigger(workflowProperties.callbackInfo);
    return refetch();
  });

  const onVerifyRunId = useCallback(
    (runId: string) => {
      return runService.getRun(runId);
    },
    [runService]
  );

  const errorMessage = useMemo((): string | undefined => {
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
  }, [error, runTriggerError]);

  return (
    <Overview
      corsNotice={corsNotice}
      errorMessage={errorMessage}
      hasMoreRuns={hasNextPage}
      loading={isLoading || runTriggerLoading}
      runItems={runItems ?? []}
      workflowProperties={workflowProperties}
      isRefreshing={isRefetching}
      onLoadMoreRuns={fetchNextPage}
      onLoadRuns={refetch}
      onOpenRun={onOpenRun}
      onRunTrigger={runTriggerCall}
      onVerifyRunId={onVerifyRunId}
    />
  );
};
