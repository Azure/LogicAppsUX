import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { ConnectionReferences } from '../../../common/models/workflow';
import type { UpdateConnectionPayload } from '../../actions/bjsworkflow/connections';
import { getExistingReferenceKey } from '../../utils/connectors/connections';

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
  existingWorkflowName?: string;
  isConsumption: boolean;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  connections: ConnectionMapping;
}

const initialState: WorkflowState = {
  isConsumption: false,
  subscriptionId: '',
  resourceGroup: '',
  location: '',
  connections: {
    references: {},
    mapping: {},
  },
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setExistingWorkflowName: (state, action: PayloadAction<string>) => {
      state.existingWorkflowName = action.payload;
    },
    setResourceDetails: (state, action: PayloadAction<ResourceDetails>) => {
      state.subscriptionId = action.payload.subscriptionId;
      state.resourceGroup = action.payload.resourceGroup;
      state.location = action.payload.location;
    },
    clearWorkflowDetails: (state) => {
      state.existingWorkflowName = undefined;
    },
    setConsumption: (state, action: PayloadAction<boolean>) => {
      state.isConsumption = action.payload;
      state.existingWorkflowName = undefined;
    },
    initializeConnectionReferences: (state, action: PayloadAction<ConnectionReferences>) => {
      const references = action.payload;
      state.connections.references = references;
    },
    changeConnectionMapping: (state, action: PayloadAction<UpdateConnectionPayload>) => {
      const { nodeId: key, connectionId, connectorId, connectionProperties, connectionRuntimeUrl, authentication } = action.payload;
      const existingReferenceKey = getExistingReferenceKey(state.connections.references, action.payload);

      if (existingReferenceKey) {
        state.connections.mapping[key] = existingReferenceKey;
      } else {
        state.connections.references[key] = {
          api: { id: connectorId },
          connection: { id: connectionId },
          connectionName: connectionId.split('/').at(-1) as string,
          connectionProperties,
          connectionRuntimeUrl,
          authentication,
        };
        state.connections.mapping[key] = key;
      }
    },
  },
});

export const {
  setExistingWorkflowName,
  setResourceDetails,
  clearWorkflowDetails,
  setConsumption,
  initializeConnectionReferences,
  changeConnectionMapping,
} = workflowSlice.actions;
export default workflowSlice.reducer;
