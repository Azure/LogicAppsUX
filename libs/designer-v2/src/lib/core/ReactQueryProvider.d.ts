/// <reference types="react" />
import { QueryClient } from '@tanstack/react-query';
import { type Persister } from '@tanstack/react-query-persist-client';
interface ReactQueryProviderProps {
    children: React.ReactNode;
    persistEnabled?: boolean;
    persistKeyWhitelist?: string[];
    resetPersistCache?: boolean;
}
export declare const getPersister: () => Persister;
export declare const getReactQueryClient: () => QueryClient;
export declare const ReactQueryProvider: (props: ReactQueryProviderProps) => import("react/jsx-runtime").JSX.Element;
export {};
