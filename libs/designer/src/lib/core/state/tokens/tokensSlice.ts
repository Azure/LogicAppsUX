import { resetWorkflowState, setStateAfterUndoRedo } from '../global';
import { clearDynamicIO, type ClearDynamicIOPayload } from '../operation/operationMetadataSlice';
import type { OutputToken as Token } from '@microsoft/designer-ui';
import { getRecordEntry } from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { UndoRedoPartialRootState } from '../undoRedo/undoRedoTypes';

export type UpdateUpstreamNodesPayload = Record<string, string[]>;
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

export const initialState: TokensState = {
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
      const { outputTokens, variables } = action.payload;
      state.outputTokens = {
        ...state.outputTokens,
        ...outputTokens,
      };
      state.variables = { ...state.variables, ...variables };
    },
    deinitializeTokensAndVariables: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      // delete state.outputTokens[id]; // TODO: This causes lots of errors as tokens are not null-safe
      delete state.variables[id];
    },
    updateVariableInfo: (state, action: PayloadAction<{ id: string; name?: string; type?: string }>) => {
      const { id, name, type } = action.payload;
      const variables = getRecordEntry(state.variables, id);
      if (!variables) {
        return;
      }
      if (name) {
        state.variables[id] = variables.map((variable) => ({
          ...variable,
          name,
        }));
      }
      if (type) {
        state.variables[id] = variables.map((variable) => ({
          ...variable,
          type,
        }));
      }
    },
    updateTokens: (state, action: PayloadAction<{ id: string; tokens: Token[] }>) => {
      const { id, tokens } = action.payload;
      const outputTokens = getRecordEntry(state.outputTokens, id);
      if (outputTokens) {
        outputTokens.tokens = tokens;
      }
    },
    updateTokenSecureStatus: (state, action: PayloadAction<{ id: string; isSecure: boolean }>) => {
      const { id, isSecure } = action.payload;
      const outputTokens = getRecordEntry(state.outputTokens, id);
      if (outputTokens) {
        outputTokens.tokens = outputTokens.tokens.map((token) => ({
          ...token,
          outputInfo: { ...token.outputInfo, isSecure },
        }));
      }
    },
    addDynamicTokens: (state, action: PayloadAction<AddDynamicTokensPayload>) => {
      const { nodeId, tokens } = action.payload;
      const outputTokens = getRecordEntry(state.outputTokens, nodeId);
      if (!outputTokens) {
        return;
      }
      const newTokens = [...outputTokens.tokens];
      for (const token of tokens) {
        const index = newTokens.findIndex((t) => t.key === token.key);
        if (index > -1) {
          newTokens.splice(index, 1, token);
        } else {
          newTokens.push(token);
        }
      }
      outputTokens.tokens = newTokens;
    },
    updateUpstreamNodes: (state, action: PayloadAction<UpdateUpstreamNodesPayload>) => {
      for (const nodeId of Object.keys(action.payload)) {
        const outputTokens = getRecordEntry(state.outputTokens, nodeId);
        if (outputTokens) {
          outputTokens.upstreamNodeIds = getRecordEntry(action.payload, nodeId) ?? [];
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(clearDynamicIO, (state, action: PayloadAction<ClearDynamicIOPayload>) => {
      const { nodeId, nodeIds: _nodeIds, outputs = true } = action.payload;
      const nodeIds = _nodeIds ?? [nodeId];
      if (outputs) {
        for (const id of nodeIds) {
          const outputTokens = getRecordEntry(state.outputTokens, id);
          if (outputTokens) {
            outputTokens.tokens = outputTokens.tokens.filter((token) => !token.outputInfo.isDynamic);
          }
        }
      }
    });
    builder.addCase(resetWorkflowState, () => initialState);
    builder.addCase(setStateAfterUndoRedo, (_, action: PayloadAction<UndoRedoPartialRootState>) => action.payload.tokens);
  },
});

// Action creators are generated for each case reducer function
export const {
  initializeTokensAndVariables,
  deinitializeTokensAndVariables,
  addDynamicTokens,
  updateVariableInfo,
  updateTokens,
  updateTokenSecureStatus,
  updateUpstreamNodes,
} = tokensSlice.actions;

export default tokensSlice.reducer;
