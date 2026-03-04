declare const rootReducer: import("@reduxjs/toolkit").Reducer<import("@reduxjs/toolkit").CombinedState<{
    workflow: import("./workflowSlice").WorkflowState;
    template: import("./templateSlice").TemplateState;
    manifest: import("./manifestSlice").ManifestState;
    panel: import("./panelSlice").PanelState;
    tab: import("./tabSlice").TabState;
    operation: import("../operation/operationMetadataSlice").OperationMetadataState;
    templateOptions: import("./templateOptionsSlice").TemplateOptionsState;
}>, import("@reduxjs/toolkit").AnyAction>;
export declare const setupStore: (preloadedState?: Partial<RootState>) => import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<import("@reduxjs/toolkit").EmptyObject & {
    workflow: import("./workflowSlice").WorkflowState;
    template: import("./templateSlice").TemplateState;
    manifest: import("./manifestSlice").ManifestState;
    panel: import("./panelSlice").PanelState;
    tab: import("./tabSlice").TabState;
    operation: import("../operation/operationMetadataSlice").OperationMetadataState;
    templateOptions: import("./templateOptionsSlice").TemplateOptionsState;
}, import("@reduxjs/toolkit").AnyAction, [import("redux-thunk").ThunkMiddleware<import("@reduxjs/toolkit").CombinedState<{
    workflow: import("./workflowSlice").WorkflowState;
    template: import("./templateSlice").TemplateState;
    manifest: import("./manifestSlice").ManifestState;
    panel: import("./panelSlice").PanelState;
    tab: import("./tabSlice").TabState;
    operation: import("../operation/operationMetadataSlice").OperationMetadataState;
    templateOptions: import("./templateOptionsSlice").TemplateOptionsState;
}>, import("@reduxjs/toolkit").AnyAction, undefined>]>;
export declare const templateStore: import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<import("@reduxjs/toolkit").EmptyObject & {
    workflow: import("./workflowSlice").WorkflowState;
    template: import("./templateSlice").TemplateState;
    manifest: import("./manifestSlice").ManifestState;
    panel: import("./panelSlice").PanelState;
    tab: import("./tabSlice").TabState;
    operation: import("../operation/operationMetadataSlice").OperationMetadataState;
    templateOptions: import("./templateOptionsSlice").TemplateOptionsState;
}, import("@reduxjs/toolkit").AnyAction, [import("redux-thunk").ThunkMiddleware<import("@reduxjs/toolkit").CombinedState<{
    workflow: import("./workflowSlice").WorkflowState;
    template: import("./templateSlice").TemplateState;
    manifest: import("./manifestSlice").ManifestState;
    panel: import("./panelSlice").PanelState;
    tab: import("./tabSlice").TabState;
    operation: import("../operation/operationMetadataSlice").OperationMetadataState;
    templateOptions: import("./templateOptionsSlice").TemplateOptionsState;
}>, import("@reduxjs/toolkit").AnyAction, undefined>]>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
export {};
