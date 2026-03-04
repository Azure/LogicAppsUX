type AddAgentHandoffPayload = {
    sourceId: string;
    targetId: string;
};
export declare const addAgentHandoff: import("@reduxjs/toolkit").AsyncThunk<void, AddAgentHandoffPayload, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
type RemoveAgentHandoffPayload = {
    agentId: string;
    toolId: string;
};
export declare const removeAgentHandoff: import("@reduxjs/toolkit").AsyncThunk<void, RemoveAgentHandoffPayload, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export {};
