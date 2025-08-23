import type { IHostService, ISearchService } from '@microsoft/logic-apps-shared';

export interface ServiceOptions {
  searchService: ISearchService;
  hostService?: IHostService;
}
