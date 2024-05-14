import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

interface ProviderProps {
  children: React.ReactNode;
}

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchInterval: false,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
      },
    },
  });

let reactQueryClient: QueryClient | undefined;

export const getReactQueryClient = (): QueryClient => {
  if (!reactQueryClient) {
    reactQueryClient = createQueryClient();
  }
  return reactQueryClient;
};

export const ReactQueryProvider = (props: ProviderProps) => {
  if (!reactQueryClient) {
    reactQueryClient = createQueryClient();
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
