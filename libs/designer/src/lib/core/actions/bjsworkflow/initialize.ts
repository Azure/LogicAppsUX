import type { IConnectionService, IOperationManifestService, ISearchService } from '@microsoft-logic-apps/designer-client-services';
import { InitConnectionService, InitOperationManifestService, InitSearchService } from '@microsoft-logic-apps/designer-client-services';

export interface ServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
}
export const InitializeServices = ({ connectionService, operationManifestService, searchService }: ServiceOptions) => {
  InitConnectionService(connectionService);
  InitOperationManifestService(operationManifestService);
  InitSearchService(searchService);
};
