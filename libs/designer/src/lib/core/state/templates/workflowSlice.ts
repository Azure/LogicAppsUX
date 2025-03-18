import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { ConnectionReferences } from '../../../common/models/workflow';
import type { UpdateConnectionPayload } from '../../actions/bjsworkflow/connections';
import { getExistingReferenceKey } from '../../utils/connectors/connections';
import { resetTemplatesState } from '../global';
import { equals } from '@microsoft/logic-apps-shared';

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
  isConsumption?: boolean;
  isCreateView?: boolean;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  workflowAppName?: string;
  logicAppName?: string;
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
  isConsumption?: boolean;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  workflowAppName?: string;
  references?: ConnectionReferences;
  isCreateView?: boolean;
}

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setInitialData: (state, action: PayloadAction<InitialWorkflowState>) => {
      const { isConsumption, subscriptionId, resourceGroup, location, workflowAppName, references, isCreateView } = action.payload;

      state.isConsumption = !!isConsumption;
      state.subscriptionId = subscriptionId;
      state.resourceGroup = resourceGroup;
      state.location = location;
      state.workflowAppName = workflowAppName;

      if (references) {
        state.connections.references = references;
      }

      if (isCreateView !== undefined) {
        state.isCreateView = isCreateView;
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
    setLogicAppDetails: (state, action: PayloadAction<{ name: string; location: string; plan: string }>) => {
      const { name, location, plan } = action.payload;
      state.logicAppName = name;
      state.location = location;

      if (!equals(plan, 'Consumption')) {
        state.workflowAppName = name;
      }

      if (name) {
        state.connections = { references: {}, mapping: {} };
      }
    },
    setWorkflowAppDetails: (state, action: PayloadAction<{ name: string; location: string }>) => {
      const { name, location } = action.payload;
      state.workflowAppName = name;
      state.location = location;

      if (name) {
        state.connections = { references: {}, mapping: {} };
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetTemplatesState, () => initialState);
  },
});

export const {
  setInitialData,
  changeConnectionMapping,
  setSubscription,
  setResourceGroup,
  setLocation,
  setWorkflowAppDetails,
  setLogicAppDetails,
} = workflowSlice.actions;
export default workflowSlice.reducer;
