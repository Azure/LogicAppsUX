import { useMount } from '@fluentui/react-hooks';
import type { OnErrorFn } from '@formatjs/intl';
import { Overview, OverviewProps } from '@microsoft/designer-ui';
import { useState, useCallback, useMemo } from 'react';
import { IntlProvider } from 'react-intl';
import messages from '../../../../libs/services/intl/src/compiled-lang/strings.json';
import { mapToRunItem, Run, RunDisplayItem, RunError, Runs } from '../run-service';
import { QueryClient, QueryClientProvider, useInfiniteQuery, useMutation, useQuery } from 'react-query';
import {} from '@storybook/addons';

const queryClient = new QueryClient();

export interface AppProps extends Pick<OverviewProps, 'corsNotice' | 'workflowProperties' | 'onOpenRun'> {
  listMoreRuns(continuationToken: string): Promise<Runs>;
  listRuns(): Promise<Runs>;
  runTrigger(): Promise<any>;
  verifyRunId(runId: string): Promise<Run | RunError>;
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
  corsNotice,
  listMoreRuns,
  listRuns,
  runTrigger,
  workflowProperties,
  verifyRunId,
  onOpenRun,
}) => {
  const loadRuns = ({ pageParam }: { pageParam?: string }) => {
    if (pageParam) {
      return listMoreRuns(pageParam);
    }
    return listRuns();
  };

  const { data, error, isLoading, fetchNextPage, hasNextPage, refetch, isRefetching } = useInfiniteQuery<Runs>('runsData', loadRuns, {
    getNextPageParam: (lastPage, pages) => lastPage.nextLink,
  });

  const runItems = useMemo(
    () =>
      data?.pages?.reduce<RunDisplayItem[]>((acc, val) => {
        acc = [...acc, ...val.runs.map(mapToRunItem)];
        return acc;
      }, []),
    [data?.pages]
  );

  const { mutate: runTriggerCall, isLoading: runTriggerLoading, error: runTriggerError } = useMutation(runTrigger);

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
      loading={isLoading || runTriggerLoading || isRefetching}
      runItems={runItems ?? []}
      workflowProperties={workflowProperties}
      onLoadMoreRuns={fetchNextPage}
      onLoadRuns={refetch}
      onOpenRun={onOpenRun}
      onRunTrigger={runTriggerCall}
      onVerifyRunId={verifyRunId}
    />
  );
};
