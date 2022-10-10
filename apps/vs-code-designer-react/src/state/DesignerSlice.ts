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
    updateMetaData: (state, action: PayloadAction<any>) => {
      const { panelMetaData } = action.payload;
      state.panelMetaData = panelMetaData;
    },
  },
});

export const { updateMetaData } = designerSlice.actions;
