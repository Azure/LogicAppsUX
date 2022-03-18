import { CONNECTION, OPERATION_MANIFEST } from '../../servicenames';
import { StandardConnectionService, StandardOperationManifestService } from '@microsoft-logic-apps/designer-services';

export const InitializeServices = (): Record<string, any> => {
  // Initialize Operation Manifest Service.
  return {
    [CONNECTION]: new StandardConnectionService({}),
    [OPERATION_MANIFEST]: new StandardOperationManifestService({}),
  };
};
