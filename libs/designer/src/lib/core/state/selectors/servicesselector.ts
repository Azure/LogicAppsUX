import { useSelector } from 'react-redux';
import { OperationManifestService as IOperationManifestService } from '@microsoft-logic-apps/designer-services';

import type { RootState } from '../../store';
import { OperationManifest } from '../../servicenames';

export const OperationManifestService = (): IOperationManifestService => {
  return useSelector((state: RootState) => {
      return state.context.services[OperationManifest] ?? undefined;
  });
};
