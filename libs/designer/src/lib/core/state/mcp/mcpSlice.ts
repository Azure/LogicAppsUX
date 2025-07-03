import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface McpState {
  workflowNames: string[];
}

const initialState: McpState = {
  workflowNames: [], // for selected logic apps, to be changed as we implement the structure
};

export const mcpSlice = createSlice({
  name: 'mcp',
  initialState,
  reducers: {
    changeWorkflowNames: (state, action: PayloadAction<string[]>) => {
      state.workflowNames = action.payload;
    },
  },
});

export default mcpSlice.reducer;
