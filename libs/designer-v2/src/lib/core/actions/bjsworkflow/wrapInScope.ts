import constants from '../../../common/constants';
import type { RootState, AppDispatch } from '../../store';
import { getNewNodeId } from '../../utils/graph';
import { getOrderedSelectedChain, getCommonGraphId } from '../../utils/multiselect';
import { initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import { clearPanel, setNodeSelection } from '../../state/panel/panelSlice';
import { wrapNodesInScope } from '../../state/workflow/workflowSlice';
import { storeStateToUndoRedoHistory } from './undoRedo';
import { initializeOperationDetails } from './add';
import { createAsyncThunk } from '@reduxjs/toolkit';

const controlConnectorId = 'connectionProviders/control';

export type WrapScopeType = 'Scope' | 'If';

interface ScopeDefinition {
  nodeType: string;
  idPrefix: string;
  operationInfo: { connectorId: string; operationId: string; type: string };
}

const scopeDefinitions: Record<WrapScopeType, ScopeDefinition> = {
  Scope: {
    nodeType: constants.NODE.TYPE.SCOPE,
    idPrefix: 'Scope',
    operationInfo: { connectorId: controlConnectorId, operationId: 'scope', type: constants.NODE.TYPE.SCOPE },
  },
  If: {
    nodeType: constants.NODE.TYPE.IF,
    idPrefix: 'Condition',
    operationInfo: { connectorId: controlConnectorId, operationId: 'if', type: constants.NODE.TYPE.IF },
  },
};

export interface WrapSelectedNodesPayload {
  nodeIds: string[];
  scopeType: WrapScopeType;
}

export const wrapSelectedNodesInScope = createAsyncThunk(
  'wrapSelectedNodesInScope',
  async (payload: WrapSelectedNodesPayload, { dispatch, getState }): Promise<string | undefined> => {
    const { nodeIds, scopeType } = payload;
    const state = getState() as RootState;

    const orderedChain = getOrderedSelectedChain(state.workflow, nodeIds);
    const graphId = getCommonGraphId(state.workflow, nodeIds);
    if (!orderedChain || graphId === undefined) {
      return undefined;
    }

    const definition = scopeDefinitions[scopeType];
    const scopeId = getNewNodeId(state.workflow, definition.idPrefix);

    dispatch(storeStateToUndoRedoHistory({ type: wrapSelectedNodesInScope.pending } as any));

    dispatch(
      wrapNodesInScope({
        scopeId,
        nodeIds: orderedChain,
        graphId,
        operation: { type: definition.nodeType },
      })
    );

    dispatch(initializeOperationInfo({ id: scopeId, ...definition.operationInfo }));
    await initializeOperationDetails(scopeId, definition.operationInfo, getState as () => RootState, dispatch as AppDispatch);

    // Select the newly created scope.
    dispatch(setNodeSelection([scopeId]));

    return scopeId;
  }
);

export const cancelWrapSelection = () => (dispatch: AppDispatch) => {
  dispatch(setNodeSelection([]));
  dispatch(clearPanel());
};
