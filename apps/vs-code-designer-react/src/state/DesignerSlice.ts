import type { IDesignerPanelMetadata } from '@microsoft-logic-apps/utils';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface designerState {
  panelMetaData: IDesignerPanelMetadata | null;
  connectionReferences: ConnectionReferences;
  baseUrl: string;
}

const initialState: designerState = {
  panelMetaData: null,
  baseUrl: '/url',
  connectionReferences: {},
};

export const designerSlice = createSlice({
  name: 'designer',
  initialState,
  reducers: {
    initializeDesigner: (state, action: PayloadAction<any>) => {
      const { panelMetadata, connectionReferences, baseUrl } = action.payload;

      state.panelMetaData = panelMetadata;
      state.connectionReferences = connectionReferences;
      state.baseUrl = baseUrl;
    },
  },
});

export const { initializeDesigner } = designerSlice.actions;
