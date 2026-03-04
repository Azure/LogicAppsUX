import type { Connector, DiscoveryOpArray, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import type { ActionPanelFavoriteItem } from '../state/panel/panelTypes';
export declare const useAllOperations: () => {
    data: DiscoveryOperation<DiscoveryResultTypes>[];
    isLoading: boolean;
};
export declare const useAllTriggers: () => {
    data: DiscoveryOperation<DiscoveryResultTypes>[];
    isLoading: boolean;
};
export declare const useAllActions: () => {
    data: DiscoveryOperation<DiscoveryResultTypes>[];
    isLoading: boolean;
};
export declare const usePreloadOperationsQuery: () => any;
export declare const useMcpServersQuery: () => import("@tanstack/react-query").UseQueryResult<{
    data: DiscoveryOperation<DiscoveryResultTypes>[];
}, unknown>;
export declare const useAllConnectors: () => {
    data: Connector[];
    isLoading: boolean;
};
export declare const usePreloadConnectorsQuery: () => any;
export declare const useAzureConnectorsLazyQuery: () => import("@tanstack/react-query").UseInfiniteQueryResult<{
    data: Connector[];
    pageParam: any;
}, unknown>;
export declare const useFavoriteOperations: (favoriteItems: ActionPanelFavoriteItem[]) => {
    favoriteConnectorsData: Connector[];
    favoriteActionsData: DiscoveryOperation<DiscoveryResultTypes>[];
    isLoadingFavoriteConnectors: boolean;
    favoriteActionsFetchNextPage: (options?: import("@tanstack/react-query").FetchNextPageOptions | undefined) => Promise<import("@tanstack/react-query").InfiniteQueryObserverResult<{
        favoriteActions: DiscoveryOpArray;
        pageParam: any;
    }, unknown>>;
    favoriteActionsHasNextPage: boolean | undefined;
    favoriteActionsIsFetchingNextPage: boolean;
    favoriteActionsIsFetching: boolean;
};
export declare const useOperationsByConnector: (connectorId: string, actionType?: 'triggers' | 'actions') => import("@tanstack/react-query").UseQueryResult<DiscoveryOpArray, unknown>;
