import { type DiscoveryOpArray } from '@microsoft/logic-apps-shared';
import type { FC } from 'react';
type SearchViewProps = {
    searchTerm: string;
    allOperations: DiscoveryOpArray;
    isLoadingOperations?: boolean;
    groupByConnector: boolean;
    setGroupByConnector: (groupedByConnector: boolean) => void;
    isLoading: boolean;
    onOperationClick: (id: string, apiId?: string) => void;
    displayRuntimeInfo: boolean;
};
export declare const SearchView: FC<SearchViewProps>;
export {};
