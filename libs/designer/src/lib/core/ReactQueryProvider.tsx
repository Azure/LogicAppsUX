import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type Persister, PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useMemo } from 'react';
import { compress, decompress } from 'lz-string';

interface ReactQueryProviderProps {
  children: React.ReactNode;
  persistEnabled?: boolean;
  persistKeyWhitelist?: string[];
  resetPersistCache?: boolean;
}

const defaultCacheTime = 1000 * 60 * 60 * 24; // 24 hours

const queryKeyDefaultWhitelist = ['swagger', 'connector', 'manifest'];

// This is really simple set / get from local storage
export const getPersister = (): Persister =>
  createSyncStoragePersister({
    storage: window.localStorage,
    serialize: (data) => compress(JSON.stringify(data)),
    deserialize: (data) => JSON.parse(decompress(data)),
  });

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchInterval: false,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        cacheTime: defaultCacheTime,
        staleTime: defaultCacheTime,
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

export const ReactQueryProvider = (props: ReactQueryProviderProps) => {
  if (!reactQueryClient) {
    reactQueryClient = createQueryClient();
  }

  const persister = useMemo(() => getPersister(), []);

  const devtools = (
    <ReactQueryDevtools
      initialIsOpen={false}
      position={'bottom-right'}
      panelProps={{ style: { zIndex: 9999999 } }}
      toggleButtonProps={{ style: { zIndex: 9999999 } }}
      closeButtonProps={{ style: { zIndex: 9999999 } }}
    />
  );

  return props.persistEnabled ? (
    <PersistQueryClientProvider
      client={reactQueryClient}
      persistOptions={{
        persister,
        buster: props.resetPersistCache ? Date.now().toString() : undefined,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const queryKeyWhitelist: string[] = [...queryKeyDefaultWhitelist, ...(props?.persistKeyWhitelist ?? [])];
            return queryKeyWhitelist.includes(query.queryKey[0] as string);
          },
        },
      }}
    >
      {props.children}
      {devtools}
    </PersistQueryClientProvider>
  ) : (
    <QueryClientProvider client={reactQueryClient}>
      {props.children}
      {devtools}
    </QueryClientProvider>
  );
};
