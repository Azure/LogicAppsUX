import type { OutputToken as Token } from '@microsoft/designer-ui';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface NodeTokens {
  isLoading?: boolean;
  tokens: Token[];
  upstreamNodeIds: string[];
}

export interface TokensState {
  outputTokens: Record<string, NodeTokens>;
}

const initialState: TokensState = {
  outputTokens: {},
};

export type AddTokensPayload = Record<string, NodeTokens>;

export const tokensSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {
    initializeTokens: (state, action: PayloadAction<AddTokensPayload>) => {
      state.outputTokens = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeTokens } = tokensSlice.actions;

export default tokensSlice.reducer;
