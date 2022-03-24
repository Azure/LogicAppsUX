import {
  InitConnectionService,
  InitOperationManifestService,
  StandardConnectionService,
  StandardOperationManifestService,
} from '@microsoft-logic-apps/designer-client-services';

export const InitializeServices = () => {
  InitConnectionService(new StandardConnectionService({}));
  InitOperationManifestService(new StandardOperationManifestService({}));
};
