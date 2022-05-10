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
  StandardConnectionService,
  StandardOperationManifestService,
  StandardSearchService,
  InitHttpClient,
} from '@microsoft-logic-apps/designer-client-services';

export interface ServiceOptions {
  httpClient: IHttpClient;
  connectionService?: IConnectionService;
  operationManifestService?: IOperationManifestService;
  searchService?: ISearchService;
}
export const InitializeServices = ({ httpClient, connectionService, operationManifestService, searchService }: ServiceOptions) => {
  InitConnectionService(
    connectionService ??
      new StandardConnectionService({
        baseUrl: '',
        apiVersion: '2018-11-01',
      })
  );
  InitOperationManifestService(operationManifestService ?? new StandardOperationManifestService({}));
  InitSearchService(searchService ?? new StandardSearchService());
  InitHttpClient(httpClient);
};
