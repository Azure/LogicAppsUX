import { store } from '../../../../core/store';
import { SearchView } from '../searchView';
import { InitSearchService, StandardSearchService } from '@microsoft/designer-client-services-logic-apps';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import TestRenderer from 'react-test-renderer';

describe('search view', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchInterval: false,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    },
  });
  const wrapper = ({ children }: { children: JSX.Element }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  it('loads and makes search results', () => {
    const searchComp = <SearchView searchTerm="azure blob"></SearchView>;
    InitSearchService(
      new StandardSearchService({
        baseUrl: '/url',
        apiVersion: '2018-11-01',
        httpClient: null as any,
        apiHubServiceDetails: {
          apiVersion: '2018-07-01-preview',
          subscriptionId: '',
          location: '',
        },
        isDev: true,
      })
    );
    const wrappedSearch = wrapper({ children: searchComp });
    const renderer = TestRenderer.create(wrappedSearch);
    const renderedSearch = renderer.root;
    console.log(renderedSearch);
  });
});
