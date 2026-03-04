declare const rootReducer: import("@reduxjs/toolkit").Reducer<import("@reduxjs/toolkit").CombinedState<{
    resource: import("./resourceSlice").ResourceState;
    operations: import("../operation/operationMetadataSlice").OperationMetadataState;
    connection: import("../connection/connectionSlice").ConnectionsStoreState;
    mcpOptions: import("./mcpOptions/mcpOptionsSlice").McpOptionsState;
    mcpPanel: import("./panel/mcpPanelSlice").PanelState;
    mcpSelection: import("./mcpselectionslice").McpSelectionState;
}>, import("@reduxjs/toolkit").AnyAction>;
export declare const setupStore: (preloadedState?: Partial<RootState>) => import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<import("@reduxjs/toolkit").EmptyObject & {
    resource: import("./resourceSlice").ResourceState;
    operations: import("../operation/operationMetadataSlice").OperationMetadataState;
    connection: import("../connection/connectionSlice").ConnectionsStoreState;
    mcpOptions: import("./mcpOptions/mcpOptionsSlice").McpOptionsState;
    mcpPanel: import("./panel/mcpPanelSlice").PanelState;
    mcpSelection: import("./mcpselectionslice").McpSelectionState;
}, import("@reduxjs/toolkit").AnyAction, [import("@reduxjs/toolkit").ThunkMiddleware<import("@reduxjs/toolkit").CombinedState<{
    resource: import("./resourceSlice").ResourceState;
    operations: import("../operation/operationMetadataSlice").OperationMetadataState;
    connection: import("../connection/connectionSlice").ConnectionsStoreState;
    mcpOptions: import("./mcpOptions/mcpOptionsSlice").McpOptionsState;
    mcpPanel: import("./panel/mcpPanelSlice").PanelState;
    mcpSelection: import("./mcpselectionslice").McpSelectionState;
}>, import("@reduxjs/toolkit").AnyAction, undefined>]>;
export declare const mcpStore: import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<import("@reduxjs/toolkit").EmptyObject & {
    resource: import("./resourceSlice").ResourceState;
    operations: import("../operation/operationMetadataSlice").OperationMetadataState;
    connection: import("../connection/connectionSlice").ConnectionsStoreState;
    mcpOptions: import("./mcpOptions/mcpOptionsSlice").McpOptionsState;
    mcpPanel: import("./panel/mcpPanelSlice").PanelState;
    mcpSelection: import("./mcpselectionslice").McpSelectionState;
}, import("@reduxjs/toolkit").AnyAction, [import("@reduxjs/toolkit").ThunkMiddleware<import("@reduxjs/toolkit").CombinedState<{
    resource: import("./resourceSlice").ResourceState;
    operations: import("../operation/operationMetadataSlice").OperationMetadataState;
    connection: import("../connection/connectionSlice").ConnectionsStoreState;
    mcpOptions: import("./mcpOptions/mcpOptionsSlice").McpOptionsState;
    mcpPanel: import("./panel/mcpPanelSlice").PanelState;
    mcpSelection: import("./mcpselectionslice").McpSelectionState;
}>, import("@reduxjs/toolkit").AnyAction, undefined>]>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
export {};
