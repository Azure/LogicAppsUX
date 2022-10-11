import type { IDesignerPanelMetadata } from '@microsoft-logic-apps/utils';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface designerState {
  panelMetaData: IDesignerPanelMetadata | null;
  connectionReferences: ConnectionReferences;
}

const initialState: designerState = {
  panelMetaData: null,
  connectionReferences: {},
};

export const designerSlice = createSlice({
  name: 'designer',
  initialState,
  reducers: {
    initializeDesigner: (state, action: PayloadAction<any>) => {
      const metaData = action.payload.panelMetadata;
      const references = action.payload.connectionReferences;

      state.panelMetaData = metaData;
      state.connectionReferences = references;
    },
  },
});

export const { initializeDesigner } = designerSlice.actions;
