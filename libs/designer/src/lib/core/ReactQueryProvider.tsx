import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

interface ProviderProps {
  children: React.ReactNode;
}

let reactQueryClient: QueryClient | undefined;

export const getReactQueryClient = (): QueryClient => {
  if (!reactQueryClient) {
    reactQueryClient = new QueryClient({
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
  }
  return reactQueryClient;
};

export const ReactQueryProvider = (props: ProviderProps) => {
  if (!reactQueryClient) {
    reactQueryClient = new QueryClient({
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
  }
  return (
    <QueryClientProvider client={reactQueryClient}>
      {props.children}
      <ReactQueryDevtools
        initialIsOpen={false}
        position={'bottom-right'}
        panelProps={{ style: { zIndex: 9999999 } }}
        toggleButtonProps={{ style: { zIndex: 9999999 } }}
        closeButtonProps={{ style: { zIndex: 9999999 } }}
      />
    </QueryClientProvider>
  );
};
