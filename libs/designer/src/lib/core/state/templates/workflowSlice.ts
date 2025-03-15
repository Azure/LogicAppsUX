import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { ConnectionReferences } from '../../../common/models/workflow';
import type { UpdateConnectionPayload } from '../../actions/bjsworkflow/connections';
import { getExistingReferenceKey } from '../../utils/connectors/connections';
import { resetTemplatesState } from '../global';

export interface ResourceDetails {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  workflowAppName?: string;
}

export interface ConnectionMapping {
  references: ConnectionReferences;
  mapping: Record<string, string>;
}

export interface WorkflowState {
  existingWorkflowName?: string;
  isConsumption: boolean;
  isCreateView: boolean;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  workflowAppName?: string;
  connections: ConnectionMapping;
}

const initialState: WorkflowState = {
  isConsumption: false,
  isCreateView: true,
  subscriptionId: '',
  resourceGroup: '',
  location: '',
  connections: {
    references: {},
    mapping: {},
  },
};

interface InitialWorkflowState {
  existingWorkflowName?: string;
  isConsumption: boolean;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  workflowAppName?: string;
  references: ConnectionReferences;
  isCreateView: boolean;
}

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setInitialData: (state, action: PayloadAction<InitialWorkflowState>) => {
      const { existingWorkflowName, isConsumption, subscriptionId, resourceGroup, location, workflowAppName, references, isCreateView } =
        action.payload;
      if (existingWorkflowName) {
        state.existingWorkflowName = existingWorkflowName;
      }

      state.isConsumption = !!isConsumption;
      state.subscriptionId = subscriptionId;
      state.resourceGroup = resourceGroup;
      state.location = location;
      state.workflowAppName = workflowAppName;
      state.connections.references = references;
      state.isCreateView = isCreateView;
    },
    clearWorkflowDetails: (state) => {
      state.existingWorkflowName = undefined;
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
    setWorkflowAppName: (state, action: PayloadAction<string>) => {
      state.workflowAppName = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetTemplatesState, () => initialState);
  },
});

export const {
  clearWorkflowDetails,
  setInitialData,
  changeConnectionMapping,
  setSubscription,
  setResourceGroup,
  setLocation,
  setWorkflowAppName,
} = workflowSlice.actions;
export default workflowSlice.reducer;
