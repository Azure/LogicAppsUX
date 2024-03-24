import type { ConnectionReferences } from '../../../common/models/workflow';
import type { UpdateConnectionPayload } from '../../actions/bjsworkflow/connections';
import { resetWorkflowState } from '../global';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { deepCompareObjects, equals, getUniqueName } from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ConnectionsStoreState {
  connectionsMapping: ConnectionMapping;
  connectionReferences: ConnectionReferences;
}

type NodeId = string;
export type ReferenceKey = string | null;
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
    changeConnectionMapping: (state, action: PayloadAction<UpdateConnectionPayload>) => {
      const { nodeId, connectionId, connectorId, connectionProperties, connectionRuntimeUrl, authentication } = action.payload;
      const existingReferenceKey = Object.keys(state.connectionReferences).find((referenceKey) => {
        const reference = state.connectionReferences[referenceKey];
        return (
          equals(reference.api.id, connectorId) &&
          equals(reference.connection.id, connectionId) &&
          equals(reference.connectionRuntimeUrl ?? '', connectionRuntimeUrl ?? '') &&
          deepCompareObjects(reference.connectionProperties, connectionProperties)
        );
      });

      if (existingReferenceKey) {
        state.connectionsMapping[nodeId] = existingReferenceKey;
      } else {
        const { name: newReferenceKey } = getUniqueName(Object.keys(state.connectionReferences), connectorId.split('/').at(-1) as string);
        state.connectionReferences[newReferenceKey] = {
          api: { id: connectorId },
          connection: { id: connectionId },
          connectionName: connectionId.split('/').at(-1) as string,
          connectionProperties,
          connectionRuntimeUrl,
          authentication,
        };
        state.connectionsMapping[nodeId] = newReferenceKey;
      }

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Connection Slice',
        message: action.type,
        args: [action.payload.nodeId, action.payload.connectorId],
      });
    },
    initEmptyConnectionMap: (state, action: PayloadAction<NodeId>) => {
      state.connectionsMapping[action.payload] = null;
    },
    initCopiedConnectionMap: (state, action: PayloadAction<{ nodeId: NodeId; referenceKey: ReferenceKey }>) => {
      const { nodeId, referenceKey } = action.payload;
      if (referenceKey && state.connectionReferences[referenceKey]) {
        state.connectionsMapping[nodeId] = referenceKey;
      }
    },
    removeNodeConnectionData: (state, action: PayloadAction<{ nodeId: NodeId }>) => {
      const { nodeId } = action.payload;
      delete state.connectionsMapping[nodeId];
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
  initCopiedConnectionMap,
  removeNodeConnectionData,
} = connectionSlice.actions;

export default connectionSlice.reducer;
