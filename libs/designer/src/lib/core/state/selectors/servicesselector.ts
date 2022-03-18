import { CONNECTION, OPERATION_MANIFEST } from '../../servicenames';
import type { RootState } from '../../store';
import type {
  ConnectionService as IConnectionService,
  OperationManifestService as IOperationManifestService,
} from '@microsoft-logic-apps/designer-services';

export const ConnectionService = (state: RootState): IConnectionService => {
  return state.context.services[CONNECTION] ?? undefined;
};

export const OperationManifestService = (state: RootState): IOperationManifestService => {
  return state.context.services[OPERATION_MANIFEST] ?? undefined;
};
