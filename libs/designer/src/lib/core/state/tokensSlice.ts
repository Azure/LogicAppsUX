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

interface AddDynamicTokensPayload {
  nodeId: string;
  tokens: Token[];
}

export const tokensSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {
    initializeTokensAndVariables: (state, action: PayloadAction<InitializeTokensAndVariablesPayload>) => {
      state.outputTokens = { ...state.outputTokens, ...action.payload.outputTokens };
      state.variables = { ...state.variables, ...action.payload.variables };
    },
    deinitializeTokensAndVariables: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      // delete state.outputTokens[id]; // TODO: This causes lots of errors as tokens are not null-safe
      delete state.variables[id];
    },
    updateTokens: (state, action: PayloadAction<{ id: string; tokens: Token[] }>) => {
      const { id, tokens } = action.payload;
      if (state.outputTokens[id]) {
        state.outputTokens[id].tokens = tokens;
      }
    },
    updateTokenSecureStatus: (state, action: PayloadAction<{ id: string; isSecure: boolean }>) => {
      const { id, isSecure } = action.payload;
      if (state.outputTokens[id]) {
        state.outputTokens[id].tokens = state.outputTokens[id].tokens.map((token) => ({
          ...token,
          outputInfo: { ...token.outputInfo, isSecure },
        }));
      }
    },
    addDynamicTokens: (state, action: PayloadAction<AddDynamicTokensPayload>) => {
      const { nodeId, tokens } = action.payload;
      if (state.outputTokens[nodeId]) {
        const newTokens = [...state.outputTokens[nodeId].tokens];
        for (const token of tokens) {
          const index = newTokens.findIndex((t) => t.key === token.key);
          if (index > -1) {
            newTokens.splice(index, 1, token);
          } else {
            newTokens.push(token);
          }
        }
        state.outputTokens[nodeId].tokens = newTokens;
      }
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeTokensAndVariables, deinitializeTokensAndVariables, addDynamicTokens, updateTokens, updateTokenSecureStatus } =
  tokensSlice.actions;

export default tokensSlice.reducer;
