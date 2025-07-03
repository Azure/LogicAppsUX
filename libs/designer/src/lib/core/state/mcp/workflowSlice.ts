import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { ConnectionReferences } from '../../../common/models/workflow';
import type { UpdateConnectionPayload } from '../../actions/bjsworkflow/connections';
import { getExistingReferenceKey } from '../../utils/connectors/connections';
import { resetMcpState } from '../global';

export interface ResourceDetails {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
}

export interface ConnectionMapping {
  references: ConnectionReferences;
  mapping: Record<string, string>;
}

export interface WorkflowState {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  logicAppName?: string;
  connections: ConnectionMapping;
}

const initialState: WorkflowState = {
  subscriptionId: '',
  resourceGroup: '',
  location: '',
  connections: {
    references: {},
    mapping: {},
  },
};

interface InitialWorkflowState {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  references?: ConnectionReferences;
}

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setInitialData: (state, action: PayloadAction<InitialWorkflowState>) => {
      const { subscriptionId, resourceGroup, location, references } = action.payload;

      state.subscriptionId = subscriptionId;
      state.resourceGroup = resourceGroup;
      state.location = location;

      if (references) {
        state.connections.references = references;
      }
    },
    changeConnectionMapping: (state, action: PayloadAction<UpdateConnectionPayload & { connectionKey: string }>) => {
      const {
        nodeId: connectionKeyInManifest,
        connectionKey,
        connectionId,
        connectorId,
        connectionProperties,
        connectionRuntimeUrl,
        authentication,
      } = action.payload;
      const existingReferenceKey = getExistingReferenceKey(state.connections.references, action.payload);

      if (existingReferenceKey) {
        state.connections.mapping[connectionKeyInManifest] = existingReferenceKey;
      } else {
        state.connections.references[connectionKey] = {
          api: { id: connectorId },
          connection: { id: connectionId },
          connectionName: connectionId.split('/').at(-1) as string,
          connectionProperties,
          connectionRuntimeUrl,
          authentication,
        };
        state.connections.mapping[connectionKeyInManifest] = connectionKey;
      }
    },
    setSubscription: (state, action: PayloadAction<string>) => {
      const subscriptionId = action.payload;
      state.subscriptionId = subscriptionId;

      if (subscriptionId) {
        state.connections.mapping = {};
      }
    },
    setResourceGroup: (state, action: PayloadAction<string>) => {
      const resourceGroup = action.payload;
      state.resourceGroup = resourceGroup;

      if (resourceGroup) {
        state.connections.mapping = {};
      }
    },
    setLocation: (state, action: PayloadAction<string>) => {
      const location = action.payload;
      state.location = location;

      if (location) {
        state.connections.mapping = {};
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialState);
  },
});

export const { setInitialData, changeConnectionMapping, setSubscription, setResourceGroup, setLocation } = workflowSlice.actions;
export default workflowSlice.reducer;
