// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import messages from '../../../../../libs/services/intl/src/compiled-lang/strings.json';
import { QueryKeys } from '../../run-service';
import type { RunDisplayItem } from '../../run-service';
import type { OnErrorFn } from '@formatjs/intl';
import { StandardRunService } from '@microsoft/designer-client-services-logic-apps';
import type { CallbackInfo } from '@microsoft/designer-client-services-logic-apps';
import type { OverviewPropertiesProps } from '@microsoft/designer-ui';
import { Overview, isRunError, mapToRunItem } from '@microsoft/designer-ui';
import type { Runs } from '@microsoft/utils-logic-apps';
import { HttpClient } from '@microsoft/vscode-extension';
import { useCallback, useMemo } from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider, useInfiniteQuery, useMutation } from 'react-query';
import invariant from 'tiny-invariant';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
    },
  },
});

export interface AppProps {
  apiVersion: string;
  baseUrl: string;
  workflowProperties: OverviewPropertiesProps;
  corsNotice?: string;
  accessToken?: string;
  onOpenRun(run: RunDisplayItem): void;
  hostVersion?: string;
}

export const App: React.FC<AppProps> = (props) => {
  const handleError: OnErrorFn = useCallback((err) => {
    if (err.code !== 'MISSING_TRANSLATION') {
      throw err;
    }
  }, []);

  return (
    <IntlProvider defaultLocale="en" locale="en-US" messages={messages} onError={handleError as any}>
      <QueryClientProvider client={queryClient}>
        <OverviewApp {...props} />
      </QueryClientProvider>
    </IntlProvider>
  );
};

const OverviewApp: React.FC<AppProps> = ({ workflowProperties, apiVersion, baseUrl, accessToken, onOpenRun, corsNotice, hostVersion }) => {
  const runService = useMemo(() => {
    const httpClient = new HttpClient({ accessToken: accessToken, baseUrl, apiHubBaseUrl: '', hostVersion });

    return new StandardRunService({
      baseUrl,
      apiVersion,
      getAccessToken: () => Promise.resolve(accessToken),
      workflowName: workflowProperties.name,
      httpClient,
    });
  }, [baseUrl, apiVersion, accessToken, workflowProperties.name, hostVersion]);

  const loadRuns = ({ pageParam }: { pageParam?: string }) => {
    if (pageParam) {
      return runService.getMoreRuns(pageParam);
    }
    return runService.getRuns();
  };

  const { data, error, isLoading, fetchNextPage, hasNextPage, refetch, isRefetching } = useInfiniteQuery<Runs>(
    QueryKeys.runsData,
    loadRuns,
    {
      getNextPageParam: (lastPage) => lastPage.nextLink,
      refetchInterval: 5000, // 5 seconds refresh interval
      refetchIntervalInBackground: false, // It will automatically refetch when window is focused
    }
  );

  const runItems = useMemo(
    () =>
      data?.pages?.reduce<RunDisplayItem[]>((acc, val) => {
        return [...acc, ...val.runs.map(mapToRunItem)];
      }, []),
    [data?.pages]
  );

  const {
    mutate: runTriggerCall,
    isLoading: runTriggerLoading,
    error: runTriggerError,
  } = useMutation(async () => {
    invariant(workflowProperties.callbackInfo, 'Run Trigger should not be runable unless callbackInfo has information');
    await runService.runTrigger(workflowProperties.callbackInfo as CallbackInfo);
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
