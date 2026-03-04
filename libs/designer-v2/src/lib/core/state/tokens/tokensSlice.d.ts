import type { OutputToken as Token } from '@microsoft/designer-ui';
import type { PayloadAction } from '@reduxjs/toolkit';
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
export type AgentParameters = Record<string, AgentParameterDeclarations>;
export type AgentParameterDeclarations = Record<string, AgentParameterDeclaration>;
export interface AgentParameterDeclaration {
    type: string;
    description: string;
}
export interface TokensState {
    outputTokens: Record<string, NodeTokens>;
    variables: Record<string, VariableDeclaration[]>;
    agentParameters: Record<string, AgentParameters>;
}
export declare const initialState: TokensState;
export interface InitializeTokensAndVariablesPayload {
    outputTokens: Record<string, NodeTokens>;
    variables: Record<string, VariableDeclaration[]>;
    agentParameters?: Record<string, AgentParameters>;
}
interface AddDynamicTokensPayload {
    nodeId: string;
    tokens: Token[];
}
export declare const tokensSlice: import("@reduxjs/toolkit").Slice<TokensState, {
    initializeTokensAndVariables: (state: import("immer/dist/internal").WritableDraft<TokensState>, action: PayloadAction<InitializeTokensAndVariablesPayload>) => void;
    deinitializeTokensAndVariables: (state: import("immer/dist/internal").WritableDraft<TokensState>, action: PayloadAction<{
        id: string;
    }>) => void;
    updateVariableInfo: (state: import("immer/dist/internal").WritableDraft<TokensState>, action: PayloadAction<{
        id: string;
        variables: VariableDeclaration[];
    }>) => void;
    updateTokens: (state: import("immer/dist/internal").WritableDraft<TokensState>, action: PayloadAction<{
        id: string;
        tokens: Token[];
    }>) => void;
    updateAgentParameter: (state: import("immer/dist/internal").WritableDraft<TokensState>, action: PayloadAction<{
        id: string;
        agent: string;
        agentParameter: Record<string, AgentParameterDeclaration>;
    }>) => void;
    addAgentParameterToNode: (state: import("immer/dist/internal").WritableDraft<TokensState>, action: PayloadAction<{
        conditionId: string;
        agentId: string;
        agentParameter: {
            name: string;
            type: string;
            description: string;
        };
    }>) => void;
    updateTokenSecureStatus: (state: import("immer/dist/internal").WritableDraft<TokensState>, action: PayloadAction<{
        id: string;
        isSecure: boolean;
    }>) => void;
    addDynamicTokens: (state: import("immer/dist/internal").WritableDraft<TokensState>, action: PayloadAction<AddDynamicTokensPayload>) => void;
    updateUpstreamNodes: (state: import("immer/dist/internal").WritableDraft<TokensState>, action: PayloadAction<UpdateUpstreamNodesPayload>) => void;
}, "tokens">;
export declare const initializeTokensAndVariables: import("@reduxjs/toolkit").ActionCreatorWithPayload<InitializeTokensAndVariablesPayload, "tokens/initializeTokensAndVariables">, deinitializeTokensAndVariables: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
}, "tokens/deinitializeTokensAndVariables">, addDynamicTokens: import("@reduxjs/toolkit").ActionCreatorWithPayload<AddDynamicTokensPayload, "tokens/addDynamicTokens">, updateVariableInfo: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    variables: VariableDeclaration[];
}, "tokens/updateVariableInfo">, updateTokens: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    tokens: Token[];
}, "tokens/updateTokens">, updateAgentParameter: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    agent: string;
    agentParameter: Record<string, AgentParameterDeclaration>;
}, "tokens/updateAgentParameter">, addAgentParameterToNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    conditionId: string;
    agentId: string;
    agentParameter: {
        name: string;
        type: string;
        description: string;
    };
}, "tokens/addAgentParameterToNode">, updateTokenSecureStatus: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    isSecure: boolean;
}, "tokens/updateTokenSecureStatus">, updateUpstreamNodes: import("@reduxjs/toolkit").ActionCreatorWithPayload<UpdateUpstreamNodesPayload, "tokens/updateUpstreamNodes">;
declare const _default: import("@reduxjs/toolkit").Reducer<TokensState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
