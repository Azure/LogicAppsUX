export interface McpOptionsState {
    servicesInitialized: boolean;
    disableConfiguration: boolean;
    reInitializeServices?: boolean;
}
export declare const mcpOptionsSlice: import("@reduxjs/toolkit").Slice<McpOptionsState, {}, "mcpOptions">;
declare const _default: import("@reduxjs/toolkit").Reducer<McpOptionsState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
