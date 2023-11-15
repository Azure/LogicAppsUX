// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import messages from '../../../../../libs/services/intl/src/compiled-lang/strings.json';
import type { OutletContext } from '../../run-service';
import type { RootState } from '../../state/store';
import './export.less';
import { Navigation } from './navigation/navigation';
import { Text } from '@fluentui/react';
import type { OnErrorFn } from '@formatjs/intl';
import { useCallback } from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useSelector } from 'react-redux';
import { Outlet, useOutletContext } from 'react-router-dom';

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

export const ExportApp: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.workflow);

  const handleError: OnErrorFn = useCallback((err) => {
    if (err.code !== 'MISSING_TRANSLATION') {
      throw err;
    }
  }, []);

  return vscodeState.initialized ? (
    <QueryClientProvider client={queryClient}>
      <IntlProvider defaultLocale="en" locale="en-US" messages={messages} onError={handleError as any}>
        <div className="msla-export">
          <Text variant="xxLarge" className="msla-export-title" block>
            Export logic app
          </Text>
          <Outlet
            context={{
              baseUrl: vscodeState.baseUrl,
              accessToken: vscodeState.accessToken,
            }}
          />
          <Navigation />
        </div>
      </IntlProvider>
    </QueryClientProvider>
  ) : null;
};

export function useOutlet() {
  return useOutletContext<OutletContext>();
}
