import type {
  IConnectionService,
  IHttpClient,
  IOperationManifestService,
  ISearchService,
  StandardUrlServiceOptions,
  IUrlService,
} from '@microsoft-logic-apps/designer-client-services';
import {
  InitUrlService,
  StandardUrlService,
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
  urlService?: IUrlService;
}
export const InitializeServices = ({
  httpClient,
  connectionService,
  operationManifestService,
  searchService,
  urlService,
}: ServiceOptions) => {
  const standardUrlServiceOptions: StandardUrlServiceOptions = {
    baseUrl: '',
    config: {
      apiOperationsPath: '',
      connectionProvidersPath: '',
      connectionsPath: '',
    },
    location: '',
    resourceGroup: '',
    subscriptionId: '',
  };
  InitUrlService(urlService ?? new StandardUrlService(standardUrlServiceOptions));
  InitConnectionService(
    connectionService ??
      new StandardConnectionService({
        baseUrl: '',
        apiVersion: '2018-11-01',
        urlService: urlService as IUrlService,
      })
  );
  InitOperationManifestService(operationManifestService ?? new StandardOperationManifestService({}));
  InitSearchService(searchService ?? new StandardSearchService());
  InitHttpClient(httpClient);
};
