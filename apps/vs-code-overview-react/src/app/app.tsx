import type { OnErrorFn } from '@formatjs/intl';
import { Overview, OverviewPropertiesProps } from '@microsoft/designer-ui';
import { useCallback, useMemo } from 'react';
import { IntlProvider } from 'react-intl';
import messages from '../../../../libs/services/intl/src/compiled-lang/strings.json';
import { mapToRunItem, RunDisplayItem, Runs } from '../run-service';
import { QueryClient, QueryClientProvider, useInfiniteQuery, useMutation } from 'react-query';
import { RunService } from '../run-service';

const queryClient = new QueryClient();

export interface AppProps {
  apiVersion: string;
  baseUrl: string;
  workflowId: string;
  workflowProperties: OverviewPropertiesProps;
  corsNotice?: string;
  onOpenRun(run: RunDisplayItem): void;
  getAccessToken: () => Promise<string>;
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

const OverviewApp: React.FC<AppProps> = ({
  workflowProperties,
  apiVersion,
  baseUrl,
  workflowId,
  getAccessToken,
  onOpenRun,
  corsNotice,
}) => {
  const runService = useMemo(
    () =>
      new RunService({
        baseUrl,
        apiVersion,
        getAccessToken,
      }),
    [apiVersion, baseUrl, getAccessToken]
  );

  const loadRuns = ({ pageParam }: { pageParam?: string }) => {
    if (pageParam) {
      return runService.getMoreRuns(pageParam);
    }
    return runService.getRuns(workflowId);
  };

  const { data, error, isLoading, fetchNextPage, hasNextPage, refetch, isRefetching } = useInfiniteQuery<Runs>('runsData', loadRuns, {
    getNextPageParam: (lastPage) => lastPage.nextLink,
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
  } = useMutation(() => runService.runTrigger(workflowProperties.callbackInfo), {
    onSuccess: refetch,
  });

  const onVerifyRunId = useCallback(
    (runId: string) => {
      return runService.getRun(runId);
    },
    [runService]
  );

  const errorMessage = useMemo((): string | undefined => {
    const loadingErrorMessage = error ? (error instanceof Error ? error.message : String(error)) : undefined;
    const triggerErrorMessage = runTriggerError
      ? runTriggerError instanceof Error
        ? runTriggerError.message
        : String(runTriggerError)
      : undefined;
    return loadingErrorMessage ?? triggerErrorMessage;
  }, [error, runTriggerError]);

  return (
    <Overview
      corsNotice={corsNotice}
      errorMessage={errorMessage ?? undefined}
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
