import type { DiscoveryOpArray, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
export declare class DefaultSearchOperationsService {
    private allOperations;
    constructor(allOperations: DiscoveryOpArray);
    private compareItems;
    private searchOptions;
    searchOperations(searchTerm: string, additionalFilter?: (operation: DiscoveryOperation<DiscoveryResultTypes>) => boolean): Promise<DiscoveryOpArray>;
}
