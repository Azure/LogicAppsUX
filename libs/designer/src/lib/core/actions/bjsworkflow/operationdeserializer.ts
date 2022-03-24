import { addConnector, addOperationManifest } from '../../state/connectorSlice';
import { initializeOperationInfo } from '../../state/operationMetadataSlice';
import { getConnector, getOperationManifest } from '../../state/selectors/actionMetadataSelector';
import type { Actions } from '../../state/workflowSlice';
import type { RootState } from '../../store';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { Dispatch } from '@reduxjs/toolkit';

export const InitializeOperationDetails = async (
  operations: Actions,
  getState: () => RootState,
  dispatch: Dispatch<any>
): Promise<void> => {
  const promises: Promise<any>[] = [];
  for (const [operationId, operation] of Object.entries(operations)) {
    const { type } = operation;

    if (OperationManifestService().isSupported(type)) {
      promises.push(initializeOperationDetailsForManifest(operationId, operation, getState, dispatch));
    }
  }

  await Promise.all(promises);
};

const initializeOperationDetailsForManifest = async (
  nodeId: string,
  definition: any,
  getState: () => RootState,
  dispatch: Dispatch<any>
): Promise<void> => {
  const state = getState();
  const service = OperationManifestService();
  const { connectorId, operationId } = await service.getOperationInfo(definition);
  const cachedOperationManifest = getOperationManifest(state, connectorId, operationId);
  const cachedConnector = getConnector(state, connectorId);

  if (!cachedConnector) {
    const connector = await ConnectionService().getConnector(connectorId);
    dispatch(addConnector({ ...connector, id: connectorId }));
  }

  if (!cachedOperationManifest) {
    const manifest = await service.getOperationManifest(connectorId, operationId);

    // TODO(psamband): Remove the 'if check' once manifest service is completed
    if (manifest) {
      dispatch(addOperationManifest({ connectorId, operationId, manifest }));
    }
  }

  dispatch(initializeOperationInfo({ id: nodeId, connectorId, operationId }));
};
