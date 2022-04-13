import {
  InitConnectionService,
  InitOperationManifestService,
  InitSearchService,
  StandardConnectionService,
  StandardOperationManifestService,
  StandardSearchService,
} from '@microsoft-logic-apps/designer-client-services';

export const InitializeServices = () => {
  InitConnectionService(new StandardConnectionService({}));
  InitOperationManifestService(new StandardOperationManifestService({}));
  InitSearchService(new StandardSearchService());
};
