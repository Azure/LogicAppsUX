import { store } from '../../../../core/store';
import { SearchView } from '../searchView';
import { InitSearchService, StandardSearchService } from '@microsoft-logic-apps/designer-client-services';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import TestRenderer from 'react-test-renderer';

describe('search view', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: JSX.Element }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  it('loads and makes search results', () => {
    const searchComp = <SearchView searchTerm="azure blob"></SearchView>;
    InitSearchService(new StandardSearchService());
    const wrappedSearch = wrapper({ children: searchComp });
    const renderer = TestRenderer.create(wrappedSearch);
    const renderedSearch = renderer.root;
    console.log(renderedSearch);
  });
});
