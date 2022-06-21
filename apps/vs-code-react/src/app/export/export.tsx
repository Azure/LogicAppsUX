import messages from '../../../../../libs/services/intl/src/compiled-lang/strings.json';
import type { OutletContext } from '../../run-service';
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

export const ExportApp: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);

  const handleError: OnErrorFn = useCallback((err) => {
    if (err.code !== 'MISSING_TRANSLATION') {
      throw err;
    }
  }, []);

  return vscodeState.initialized ? (
    <IntlProvider defaultLocale="en" locale="en-US" messages={messages} onError={handleError}>
      <QueryClientProvider client={queryClient}>
        <div className="msla-export">
          <Text variant="xxLarge" className="msla-export-title" nowrap block>
            Export Logic App
          </Text>
          <Outlet context={{ baseUrl: vscodeState.baseUrl, accessToken: vscodeState.accessToken }} />
        </div>
      </QueryClientProvider>
    </IntlProvider>
  ) : null;
};

export function useOutlet() {
  return useOutletContext<OutletContext>();
}
