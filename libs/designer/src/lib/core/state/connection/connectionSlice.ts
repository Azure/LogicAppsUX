import { getExistingReferenceKey } from '../../utils/connectors/connections';
import type { ConnectionMapping, ConnectionReference, ConnectionReferences, NodeId, ReferenceKey } from '../../../common/models/workflow';
import type { UpdateConnectionPayload } from '../../actions/bjsworkflow/connections';
import { resetWorkflowState, setStateAfterUndoRedo } from '../global';
import { LogEntryLevel, LoggerService, getResourceNameFromId, getUniqueName } from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { UndoRedoPartialRootState } from '../undoRedo/undoRedoTypes';
import { deinitializeOperations, initializeConnectionMappings } from '../../../core/actions/bjsworkflow/mcp';

export interface ConnectionsStoreState {
  connectionsMapping: ConnectionMapping;
  connectionReferences: ConnectionReferences;
  loading: {
    initializeConnectionMappings: boolean;
  };
}

export const initialConnectionsState: ConnectionsStoreState = {
  connectionsMapping: {},
  connectionReferences: {},
  loading: {
    initializeConnectionMappings: false,
  },
};

type ConnectionReferenceMap = Record<string, ReferenceKey>;

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
      const { key, reference } = getReferenceForConnection(state.connectionReferences, action.payload);

      if (reference) {
        state.connectionReferences[key] = reference;
      }

      state.connectionsMapping[action.payload.nodeId] = key;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Connection Slice',
        message: action.type,
        args: [action.payload.nodeId, action.payload.connectorId],
      });
    },
    changeConnectionMappingsForNodes: (
      state,
      action: PayloadAction<Omit<UpdateConnectionPayload, 'nodeId'> & { nodeIds: string[]; reset?: boolean }>
    ) => {
      const { reset, nodeIds, connectorId } = action.payload;
      const { key, reference } = getReferenceForConnection(state.connectionReferences, action.payload);

      if (reference) {
        state.connectionReferences[key] = reference;
      }

      if (reset) {
        state.connectionsMapping = {};
      }

      for (const nodeId of nodeIds) {
        state.connectionsMapping[nodeId] = key;
      }

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Mcp:Connection Slice',
        message: action.type,
        args: [nodeIds, connectorId],
      });
    },
    initEmptyConnectionMap: (state, action: PayloadAction<NodeId[]>) => {
      for (const nodeId of action.payload) {
        state.connectionsMapping[nodeId] = null;
      }
    },
    initCopiedConnectionMap: (state, action: PayloadAction<{ connectionReferences: ConnectionReferenceMap }>) => {
      const { connectionReferences } = action.payload;
      Object.entries(connectionReferences).forEach(([nodeId, referenceKey]) => {
        if (referenceKey && state.connectionReferences[referenceKey]) {
          state.connectionsMapping[nodeId] = referenceKey;
        }
      });
    },
    initScopeCopiedConnections: (
      state,
      action: PayloadAction<Record<string, { connectionReference: ConnectionReference; referenceKey: string }>>
    ) => {
      const copiedConnections = action.payload;
      Object.entries(copiedConnections).forEach(([nodeId, { connectionReference, referenceKey }]) => {
        if (referenceKey && state.connectionReferences[referenceKey]) {
          state.connectionsMapping[nodeId] = referenceKey;
        } else {
          state.connectionReferences[referenceKey] = connectionReference;
          state.connectionsMapping[nodeId] = referenceKey;
        }
      });
    },
    removeNodeConnectionData: (state, action: PayloadAction<{ nodeId: NodeId }>) => {
      const { nodeId } = action.payload;
      delete state.connectionsMapping[nodeId];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialConnectionsState);
    builder.addCase(setStateAfterUndoRedo, (_, action: PayloadAction<UndoRedoPartialRootState>) => action.payload.connections);
    builder.addCase(initializeConnectionMappings.pending, (state) => {
      state.loading.initializeConnectionMappings = true;
    });
    builder.addCase(initializeConnectionMappings.fulfilled, (state) => {
      state.loading.initializeConnectionMappings = false;
    });
    builder.addCase(initializeConnectionMappings.rejected, (state) => {
      state.loading.initializeConnectionMappings = false;
    });
    builder.addCase(deinitializeOperations.fulfilled, (state, action: PayloadAction<string[]>) => {
      for (const nodeId of action.payload) {
        delete state.connectionsMapping[nodeId];
      }
    });
  },
});

const getReferenceForConnection = (
  references: ConnectionReferences,
  payload: Omit<UpdateConnectionPayload, 'nodeId'>
): { key: string; reference?: ConnectionReference } => {
  const { connectionId, connectorId, connectionProperties, connectionRuntimeUrl, authentication } = payload;
  const existingReferenceKey = getExistingReferenceKey(references, payload);

  if (existingReferenceKey) {
    return { key: existingReferenceKey };
  }

  const { name: newReferenceKey } = getUniqueName(Object.keys(references), connectorId.split('/').at(-1) as string);
  return {
    key: newReferenceKey,
    reference: {
      api: { id: connectorId },
      connection: { id: connectionId },
      connectionName: getResourceNameFromId(connectionId),
      connectionProperties,
      connectionRuntimeUrl,
      authentication,
    },
  };
};

// Action creators are generated for each case reducer function
export const {
  initializeConnectionReferences,
  initializeConnectionsMappings,
  changeConnectionMapping,
  initEmptyConnectionMap,
  initCopiedConnectionMap,
  initScopeCopiedConnections,
  removeNodeConnectionData,
  changeConnectionMappingsForNodes,
} = connectionSlice.actions;

export default connectionSlice.reducer;
