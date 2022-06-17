import messages from '../../../../../libs/services/intl/src/compiled-lang/strings.json';
import type { RootState } from '../../state/store';
import './export.less';
import { Text } from '@fluentui/react';
import type { OnErrorFn } from '@formatjs/intl';
import { useCallback } from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useSelector } from 'react-redux';
import { Outlet, useOutletContext } from 'react-router-dom';

const queryClient = new QueryClient();

type ContextType = any;

export const ExportApp: React.FC = () => {
  const overviewState = useSelector((state: RootState) => state.overview);

  const handleError: OnErrorFn = useCallback((err) => {
    if (err.code !== 'MISSING_TRANSLATION') {
      throw err;
    }
  }, []);

  return overviewState.initialized ? (
    <IntlProvider defaultLocale="en" locale="en-US" messages={messages} onError={handleError}>
      <QueryClientProvider client={queryClient}>
        <div className="msla-export">
          <Text variant="xxLarge" className="msla-export-title" nowrap block>
            Export Logic App
          </Text>
          <Outlet context={{ baseUrl: overviewState.baseUrl, accessToken: overviewState.accessToken }} />
        </div>
      </QueryClientProvider>
    </IntlProvider>
  ) : null;
};

export function useOutlet() {
  return useOutletContext<ContextType>();
}
