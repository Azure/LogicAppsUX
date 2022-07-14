/* eslint-disable @typescript-eslint/no-empty-function */
import type { ConnectionsJSON, FunctionsConnection, ServiceProviderConnection } from './connectionReferences';
import type { RootState } from './store';
import type { ConnectionReference, ConnectionReferences } from '@microsoft/logic-apps-designer';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface WorkflowLoadingState {
  armToken?: string;
  resourcePath?: string;
  loadingMethod: 'file' | 'arm';
  workflowDefinition: LogicAppsV2.WorkflowDefinition | null;
  connections: ConnectionReferences;
  readOnly: boolean;
  monitoringView: boolean;
}

const initialState: WorkflowLoadingState = {
  workflowDefinition: null,
  connections: {},
  loadingMethod: 'file',
  resourcePath: 'simpleBigworkflow.json',
  readOnly: false,
  monitoringView: false,
};

type WorkflowPayload = {
  workflowDefinition: LogicAppsV2.WorkflowDefinition;
  connectionReferences: ConnectionReferences;
};

export const loadWorkflow = createAsyncThunk('workflowLoadingState/loadWorkflow', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  if (currentState.workflowLoader.loadingMethod === 'arm') {
    const results = await fetch(
      `https://management.azure.com/${currentState.workflowLoader.resourcePath}?api-version=2020-06-01&$expand=connections.json`,
      {
        headers: {
          Authorization: `Bearer ${currentState.workflowLoader.armToken}`,
        },
      }
    );
    if (results.status === 200) {
      const wf = await results.json();
      const workflowDefinition = wf.properties.files['workflow.json'].definition;
      const connections = wf.properties.files['connections.json'] as ConnectionsJSON;
      const connectionReferences: ConnectionReferences = convertToConnectionReferences(connections);
      return { workflowDefinition, connectionReferences } as WorkflowPayload;
    } else {
      return null;
    }
  } else {
    try {
      const wf = await import(`../../../../__mocks__/workflows/${currentState.workflowLoader.resourcePath}`);
      return wf.definition;
    } catch {
      return null;
    }
  }
});

function convertToConnectionReferences(connectionData: ConnectionsJSON | undefined): ConnectionReferences {
  if (!connectionData) {
    return {};
  }
  const connectionReferences: ConnectionReferences = { ...connectionData.managedApiConnections };
  convertToConnectionReferenceRefactor(connectionData.functionConnections, connectionReferences);
  convertToConnectionReferenceRefactor(connectionData.serviceProviderConnections, connectionReferences);

  console.log(connectionReferences);
  return connectionReferences;
}

function convertToConnectionReferenceRefactor(
  connections: Record<string, ServiceProviderConnection | FunctionsConnection> | undefined,
  connectionReferences: ConnectionReferences
) {
  if (connections) {
    for (const key of Object.keys(connections)) {
      const connection = connections[key];
      let mappedConnection: ConnectionReference;
      if ('serviceProvider' in connection) {
        mappedConnection = {
          api: { id: connection.serviceProvider.id },
          connectionName: connection.displayName,
          connection: {
            id: connection.serviceProvider.id,
          },
        };
      } else {
        mappedConnection = {
          api: {
            id: connection.function.id,
          },
          connection: {
            id: connection.function.id,
          },
          connectionName: connection.displayName,
        };
      }
      // eslint-disable-next-line no-param-reassign
      connectionReferences[key] = mappedConnection;
    }
  }
}

export const workflowLoadingSlice = createSlice({
  name: 'workflowLoader',
  initialState,
  reducers: {
    changeArmToken: (state, action: PayloadAction<string>) => {
      state.armToken = action.payload;
    },
    changeResourcePath: (state, action: PayloadAction<string>) => {
      state.resourcePath = action.payload;
    },
    changeLoadingMethod: (state, action: PayloadAction<'file' | 'arm'>) => {
      state.loadingMethod = action.payload;
    },
    setReadOnly: (state, action: PayloadAction<boolean>) => {
      state.readOnly = action.payload;
    },
    setMonitoringView: (state, action: PayloadAction<boolean>) => {
      state.monitoringView = action.payload;
      if (action.payload) {
        state.readOnly = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadWorkflow.fulfilled, (state, action: PayloadAction<WorkflowPayload>) => {
      state.workflowDefinition = action.payload?.workflowDefinition;
      state.connections = action.payload?.connectionReferences ? action.payload.connectionReferences : {};
    });
    builder.addCase(loadWorkflow.rejected, (state) => {
      state.workflowDefinition = null;
    });
  },
});

export const { changeArmToken, changeResourcePath, changeLoadingMethod, setReadOnly, setMonitoringView } = workflowLoadingSlice.actions;

export default workflowLoadingSlice.reducer;
