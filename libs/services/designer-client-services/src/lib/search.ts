import type {
  ArmResource,
  Connector,
  DiscoveryOperation,
  DiscoveryResultTypes,
  DiscoveryWorkflow,
  DiscoveryWorkflowTrigger,
} from '@microsoft/utils-logic-apps';
import { AssertionErrorCode, AssertionException, isBuiltInConnector, isCustomConnector } from '@microsoft/utils-logic-apps';
import Fuse from 'fuse.js';
import type { IntlShape } from 'react-intl';

export type OperationRuntimeCategory = {
  key: string;
  text: string;
};

export interface ISearchService {
  getAllConnectors(): Promise<Connector[]>;
  getAzureConnectorsByPage(page: number): Promise<Connector[]>;
  getCustomConnectorsByNextlink(nextlink?: string): Promise<{ nextlink?: string; value: Connector[] }>;
  getBuiltInConnectors(): Promise<Connector[]>;
  getAllOperations(): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getRequestWorkflows?(): Promise<ArmResource<DiscoveryWorkflow>[]>;
  getBatchWorkflows?(): Promise<ArmResource<DiscoveryWorkflow>[]>;
  getWorkflowTriggers?(workflowId: string): Promise<ArmResource<DiscoveryWorkflowTrigger>[]>;
  getAzureOperationsByPage(page: number): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getCustomOperationsByPage(page: number): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getBuiltInOperations(): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
}

export interface ISearchService2 {
  searchOperations(searchTerm: string, actionType?: string, runtimeFilter?: string): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getRuntimeCategories(): OperationRuntimeCategory[];
  filterConnector(connector: Connector, runtimeFilter: string): boolean;
}

let service: ISearchService;

export const InitSearchService = (searchService: ISearchService): void => {
  service = searchService;
};

export const SearchService = (): ISearchService => {
  // Danielle: we need this for every service, how do we extract?
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'SearchService needs to be initialized before using');
  }

  return service;
};

export interface SearchResult {
  searchOperations: DiscoveryOperation<DiscoveryResultTypes>[];
}

let service2: ISearchService2;

export const InitSearchService2 = (searchService2: ISearchService2): void => {
  service2 = searchService2;
};

export const SearchService2 = (allOperations: DiscoveryOperation<DiscoveryResultTypes>[], intl?: IntlShape): ISearchService2 => {
  if (!service2) {
    return new DefaultSearchService2(allOperations, intl);
  }

  return service2;
};

class DefaultSearchService2 implements ISearchService2 {
  constructor(private allOperations: DiscoveryOperation<DiscoveryResultTypes>[], private intl?: IntlShape) {}

  private compareItems(
    a: Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>,
    b: Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>
  ): number {
    // isCustomApi can be undefined since it is up to the host to pass it; when
    // undefined we default to false so that the custom checks are not true/executed
    const isACustom: boolean = a.item.properties.isCustomApi || false;
    const isBCustom: boolean = b.item.properties.isCustomApi || false;
    if (isACustom && !isBCustom) return 1;
    if (!isACustom && isBCustom) return -1;
    if (a.score !== undefined && b.score !== undefined) {
      if (a.score < b.score) return -1;
      if (a.score > b.score) return 1;
    }
    // If a has no score and b does, put b first
    if (a.score === undefined && b.score !== undefined) return 1;
    // If b has no score and a does, put a first
    if (a.score !== undefined && b.score === undefined) return -1;
    return 0;
  }

  private searchOptions() {
    return {
      includeScore: true,
      threshold: 0.4,
      keys: [
        {
          name: 'properties.summary', // Operation 'name'
          weight: 2.1,
        },
        {
          name: 'displayName', // Connector 'name'
          getFn: (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
            return operation.properties.api.displayName;
          },
          weight: 2,
        },
        {
          name: 'description', // Connector 'description'
          getFn: (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
            return operation.properties.api.description ?? '';
          },
          weight: 1.9,
        },
      ],
    };
  }

  public searchOperations(
    searchTerm: string,
    actionType?: string | undefined,
    runtimeFilter?: string | undefined
  ): Promise<DiscoveryOperation<DiscoveryResultTypes>[]> {
    type FuseSearchResult = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>;

    const filterItems = (searchResult: FuseSearchResult): boolean => {
      if (runtimeFilter) {
        if (runtimeFilter === 'inapp' && !isBuiltInConnector(searchResult.item.properties.api.id)) return false;
        else if (runtimeFilter === 'custom' && !isCustomConnector(searchResult.item.properties.api.id)) return false;
        else if (runtimeFilter === 'shared')
          if (isBuiltInConnector(searchResult.item.properties.api.id) || isCustomConnector(searchResult.item.properties.api.id))
            return false;
      }

      if (actionType) {
        const isTrigger = searchResult.item.properties?.trigger !== undefined;
        if (actionType.toLowerCase() === 'actions' && isTrigger) return false;
        else if (actionType.toLowerCase() === 'triggers' && !isTrigger) return false;
      }

      return true;
    };
    const fuse = new Fuse(this.allOperations, this.searchOptions());
    return Promise.resolve(
      fuse
        .search(searchTerm, { limit: 200 })
        .filter(filterItems)
        .sort(this.compareItems)
        .map((result) => result.item)
    );
  }

  public getRuntimeCategories(): OperationRuntimeCategory[] {
    if (!this.intl) {
      return [];
    }

    return [
      {
        key: 'inapp',
        text: this.intl.formatMessage({ defaultMessage: 'In-App', description: 'Filter by In App category of connectors' }),
      },
      {
        key: 'shared',
        text: this.intl.formatMessage({ defaultMessage: 'Shared', description: 'Filter by Shared category of connectors' }),
      },
      {
        key: 'custom',
        text: this.intl.formatMessage({ defaultMessage: 'Custom', description: 'Filter by Custom category of connectors' }),
      },
    ];
  }

  public filterConnector(connector: Connector, runtimeFilter: string): boolean {
    if (runtimeFilter === 'inapp' && !isBuiltInConnector(connector.id)) return false;
    else if (runtimeFilter === 'custom' && !isCustomConnector(connector.id)) return false;
    else if (runtimeFilter === 'shared') if (isBuiltInConnector(connector.id) || isCustomConnector(connector.id)) return false;
    return true;
  }
}
