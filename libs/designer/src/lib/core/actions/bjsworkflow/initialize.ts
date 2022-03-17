import { StandardOperationManifestService } from '@microsoft-logic-apps/designer-services';
import { OperationManifest } from '../../servicenames';

export const InitializeServices = (): Record<string, any> => {
    // Initialize Operation Manifest Service.
    return {
        [OperationManifest]: new StandardOperationManifestService({})
    };
};