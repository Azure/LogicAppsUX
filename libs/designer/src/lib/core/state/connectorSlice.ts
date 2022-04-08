import type { Connector, OperationManifest } from '@microsoft-logic-apps/utils';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ConnectorsState {
  connectors: Record<string, Connector>;
  swaggers: Record<string, any>;
  manifests: Record<string, OperationManifest>;
}

const initialState: ConnectorsState = {
  connectors: {},
  swaggers: {},
  manifests: {},
};

export const connectorsSlice = createSlice({
  name: 'connectors',
  initialState,
  reducers: {
    addConnector: (state, action: PayloadAction<Connector>) => {
      const connector = action.payload;
      state.connectors[connector.id.toLowerCase()] = connector;
    },
    addOperationManifest: (state, action: PayloadAction<{ connectorId: string; operationId: string; manifest: OperationManifest }>) => {
      const { connectorId, operationId, manifest } = action.payload;
      const {
        properties: { connector },
      } = manifest;
      const normalizedId = connectorId.toLowerCase();
      state.manifests[`${normalizedId}-${operationId.toLowerCase()}`] = manifest;

      if (connector) {
        state.connectors[normalizedId] = connector;
      }
    },
    addSwagger: (state, action: PayloadAction<{ connectorId: string; swagger: any }>) => {
      const { connectorId, swagger } = action.payload;
      state.swaggers[connectorId.toLowerCase()] = swagger;
    },
  },
});

// Action creators are generated for each case reducer function
export const { addConnector, addOperationManifest, addSwagger } = connectorsSlice.actions;

export default connectorsSlice.reducer;
