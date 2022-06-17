import messages from '../../../../../libs/services/intl/src/compiled-lang/strings.json';
import './export.less';
import { Text } from '@fluentui/react';
import type { OnErrorFn } from '@formatjs/intl';
import { useCallback } from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Outlet } from 'react-router-dom';

const queryClient = new QueryClient();

export const ExportApp: React.FC = () => {
  const handleError: OnErrorFn = useCallback((err) => {
    if (err.code !== 'MISSING_TRANSLATION') {
      throw err;
    }
  }, []);

  return (
    <IntlProvider defaultLocale="en" locale="en-US" messages={messages} onError={handleError}>
      <QueryClientProvider client={queryClient}>
        <div className="msla-export">
          <Text variant="xxLarge" className="msla-export-title" nowrap block>
            Export Logic App
          </Text>
          <Outlet />
        </div>
      </QueryClientProvider>
    </IntlProvider>
  );
};
