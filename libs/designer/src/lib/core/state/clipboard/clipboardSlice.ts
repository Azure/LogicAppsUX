import type { NodeOperation } from '../operation/operationMetadataSlice';
import type { ClipboardState } from './clipboardInterfaces';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

const initialState: ClipboardState = {
  copiedNode: null,
};

interface CopyNodeInterface {
  nodeId: string;
  operationInfo: NodeOperation;
}

export const clipboardSlice = createSlice({
  name: 'clipboard',
  initialState,
  reducers: {
    copyNode: (state: ClipboardState, action: PayloadAction<CopyNodeInterface>) => {
      state.copiedNode = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { copyNode } = clipboardSlice.actions;

export default clipboardSlice.reducer;
