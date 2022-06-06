import type {
  IConnectionService,
  IHttpClient,
  IOperationManifestService,
  ISearchService,
} from '@microsoft-logic-apps/designer-client-services';
import {
  InitConnectionService,
  InitOperationManifestService,
  InitSearchService,
  InitHttpClient,
} from '@microsoft-logic-apps/designer-client-services';

export interface ServiceOptions {
  httpClient: IHttpClient;
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
}
export const InitializeServices = ({ httpClient, connectionService, operationManifestService, searchService }: ServiceOptions) => {
  InitConnectionService(connectionService);
  InitOperationManifestService(operationManifestService);
  InitSearchService(searchService);
  InitHttpClient(httpClient);
};
