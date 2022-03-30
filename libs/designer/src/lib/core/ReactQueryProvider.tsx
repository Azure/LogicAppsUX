import { QueryClient, QueryClientProvider } from 'react-query';

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
  return <QueryClientProvider client={reactQueryClient}>{props.children}</QueryClientProvider>;
};
