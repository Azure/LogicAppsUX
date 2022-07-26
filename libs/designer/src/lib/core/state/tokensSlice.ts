import type { OutputToken as Token } from '@microsoft/designer-ui';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface NodeTokens {
  isLoading?: boolean;
  tokens: Token[];
  upstreamNodeIds: string[];
}

export interface VariableDeclaration {
  name: string;
  type: string;
}

export interface TokensState {
  outputTokens: Record<string, NodeTokens>;
  variables: Record<string, VariableDeclaration[]>;
}

const initialState: TokensState = {
  outputTokens: {},
  variables: {},
};

export interface InitializeTokensAndVariablesPayload {
  outputTokens: Record<string, NodeTokens>;
  variables: Record<string, VariableDeclaration[]>;
}

export const tokensSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {
    initializeTokensAndVariables: (state, action: PayloadAction<InitializeTokensAndVariablesPayload>) => {
      state.outputTokens = { ...state.outputTokens, ...action.payload.outputTokens };
      state.variables = { ...state.variables, ...action.payload.variables };
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeTokensAndVariables } = tokensSlice.actions;

export default tokensSlice.reducer;
