import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

interface ProviderProps {
  children: React.ReactNode;
}

let reactQueryClient: QueryClient | undefined;

export const getReactQueryClient = (): QueryClient => {
  if (!reactQueryClient) {
    reactQueryClient = new QueryClient();
  }
  return reactQueryClient;
};

export const ReactQueryProvider = (props: ProviderProps) => {
  if (!reactQueryClient) {
    reactQueryClient = new QueryClient();
  }
  return (
    <QueryClientProvider client={reactQueryClient}>
      {props.children}
      <ReactQueryDevtools
        initialIsOpen={true}
        position={'bottom-right'}
        panelProps={{ style: { zIndex: 9999999 } }}
        toggleButtonProps={{ style: { zIndex: 9999999 } }}
        closeButtonProps={{ style: { zIndex: 9999999 } }}
      />
    </QueryClientProvider>
  );
};
