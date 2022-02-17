import { useMount } from '@fluentui/react-hooks';
import type { OnErrorFn } from '@formatjs/intl';
import { Overview, OverviewProps } from '@microsoft/designer-ui';
import { useCallback, useState } from 'react';
import { IntlProvider } from 'react-intl';
import messages from '../../../../libs/services/intl/src/compiled-lang/strings.json';
import { mapToRunItem, Run, RunDisplayItem, RunError, Runs } from '../run-service';

export interface AppProps extends Pick<OverviewProps, 'corsNotice' | 'workflowProperties' | 'onOpenRun'> {
  listMoreRuns(continuationToken: string): Promise<Runs>;
  listRuns(): Promise<Runs>;
  runTrigger(): Promise<any>;
  verifyRunId(runId: string): Promise<Run | RunError>;
}

export const App: React.FC<AppProps> = ({ corsNotice, listMoreRuns, listRuns, runTrigger, workflowProperties, verifyRunId, onOpenRun }) => {
  const [continuationToken, setContinuationToken] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [runItems, setRunItems] = useState<RunDisplayItem[]>([]);

  useMount(() => {
    handleLoadRuns();
  });

  const handleError: OnErrorFn = (err) => {
    if (err.code !== 'MISSING_TRANSLATION') {
      throw err;
    }
  };

  const handleLoadMoreRuns = useCallback(async () => {
    try {
      setErrorMessage(undefined);
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { nextLink, runs } = await listMoreRuns(continuationToken!);
      setContinuationToken(nextLink);
      setRunItems([...runItems, ...runs.map(mapToRunItem)]);
    } catch (ex) {
      setErrorMessage(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setLoading(false);
    }
  }, [continuationToken, listMoreRuns, runItems]);

  const handleLoadRuns = useCallback(async () => {
    try {
      setErrorMessage(undefined);
      setLoading(true);
      const { nextLink, runs } = await listRuns();
      setContinuationToken(nextLink);
      setRunItems(runs.map(mapToRunItem));
    } catch (ex) {
      setErrorMessage(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setLoading(false);
    }
  }, [listRuns]);

  const handleRunTrigger = useCallback(async () => {
    try {
      setErrorMessage(undefined);
      setLoading(true);
      await runTrigger();
    } catch (ex) {
      setErrorMessage(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setLoading(false);
    }
  }, [runTrigger]);

  const handleVerifyRunId = useCallback(
    async (runId: string): Promise<Run | RunError> => {
      try {
        return verifyRunId(runId);
      } catch (ex) {
        return {
          error: {
            code: '',
            message: ex instanceof Error ? ex.message : String(ex),
          },
        };
      }
    },
    [verifyRunId]
  );

  return (
    <IntlProvider defaultLocale="en" locale="en-US" messages={messages} onError={handleError}>
      <Overview
        corsNotice={corsNotice}
        errorMessage={errorMessage}
        hasMoreRuns={!!continuationToken}
        loading={loading}
        runItems={runItems}
        workflowProperties={workflowProperties}
        onLoadMoreRuns={handleLoadMoreRuns}
        onLoadRuns={handleLoadRuns}
        onOpenRun={onOpenRun}
        onRunTrigger={handleRunTrigger}
        onVerifyRunId={handleVerifyRunId}
      />
    </IntlProvider>
  );
};
