import {
  InitConnectionService,
  InitOperationManifestService,
  InitSearchService,
  StandardConnectionService,
  StandardOperationManifestService,
  StandardSearchService,
} from '@microsoft-logic-apps/designer-client-services';

export const InitializeServices = (getToken: () => string) => {
  InitConnectionService(
    new StandardConnectionService({
      baseUrl: '',
      apiVersion: '2018-11-01',
      getToken,
    })
  );
  InitOperationManifestService(new StandardOperationManifestService({}));
  InitSearchService(new StandardSearchService());
};
