import Constants from '../../../common/constants';
import type { ConnectionReferences } from '../../../common/models/workflow';
import { ImpersonationSource } from '../../../common/models/workflow';
import { resetWorkflowState } from '../global';
import { equals, getUniqueName } from '@microsoft/utils-logic-apps';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ConnectionsStoreState {
  connectionsMapping: ConnectionMapping;
  connectionReferences: ConnectionReferences;
}

type NodeId = string;
type ReferenceKey = string | null;
export type ConnectionMapping = Record<NodeId, ReferenceKey>;

export const initialConnectionsState: ConnectionsStoreState = {
  connectionsMapping: {},
  connectionReferences: {},
};

export const connectionSlice = createSlice({
  name: 'connections',
  initialState: initialConnectionsState,
  reducers: {
    initializeConnectionReferences: (state, action: PayloadAction<ConnectionReferences>) => {
      state.connectionReferences = action.payload;
    },
    initializeConnectionsMappings: (state, action: PayloadAction<ConnectionMapping>) => {
      state.connectionsMapping = action.payload;
    },
    changeConnectionMapping: (state, action: PayloadAction<{ nodeId: NodeId; connectionId: string; connectorId: string }>) => {
      const { nodeId, connectionId, connectorId } = action.payload;
      const existingReferenceKey = Object.keys(state.connectionReferences).find((referenceKey) => {
        const reference = state.connectionReferences[referenceKey];
        return equals(reference.api.id, connectorId) && equals(reference.connection.id, connectionId);
      });

      if (existingReferenceKey) {
        state.connectionsMapping[nodeId] = existingReferenceKey;
      } else {
        const { name: newReferenceKey } = getUniqueName(Object.keys(state.connectionReferences), connectorId.split('/').at(-1) as string);
        state.connectionReferences[newReferenceKey] = {
          api: { id: connectorId },
          connection: { id: connectionId },
          connectionName: connectionId.split('/').at(-1) as string,
        };
        state.connectionsMapping[nodeId] = newReferenceKey;
      }
    },
    initEmptyConnectionMap: (state, action: PayloadAction<NodeId>) => {
      state.connectionsMapping[action.payload] = null;
    },
    removeNodeConnectionData: (state, action: PayloadAction<{ nodeId: NodeId }>) => {
      const { nodeId } = action.payload;
      delete state.connectionsMapping[nodeId];
    },
    addInvokerSupport: (state, action: PayloadAction<{ connectionReferences: ConnectionReferences }>) => {
      const connectionReferences = action.payload.connectionReferences;
      for (const connection in connectionReferences) {
        if (
          connectionReferences[connection] !== undefined &&
          connectionReferences[connection].api.id.indexOf(Constants.INVOKER_CONNECTION.DATAVERSE_CONNECTOR_ID) > -1
        ) {
          state.connectionReferences[connection] = {
            ...connectionReferences[connection],
            impersonation: {
              source: ImpersonationSource.Invoker,
            },
          };
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialConnectionsState);
  },
});

// Action creators are generated for each case reducer function
export const {
  initializeConnectionReferences,
  initializeConnectionsMappings,
  changeConnectionMapping,
  initEmptyConnectionMap,
  removeNodeConnectionData,
  addInvokerSupport,
} = connectionSlice.actions;

export default connectionSlice.reducer;
