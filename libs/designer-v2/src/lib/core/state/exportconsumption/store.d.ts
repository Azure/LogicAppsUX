declare const rootReducer: import("@reduxjs/toolkit").Reducer<import("@reduxjs/toolkit").CombinedState<{
    resource: import("./resourceslice").ResourceState;
}>, import("@reduxjs/toolkit").AnyAction>;
export declare const setupStore: (preloadedState?: Partial<RootState>) => import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<import("@reduxjs/toolkit").EmptyObject & {
    resource: import("./resourceslice").ResourceState;
}, import("@reduxjs/toolkit").AnyAction, [import("@reduxjs/toolkit").ThunkMiddleware<import("@reduxjs/toolkit").CombinedState<{
    resource: import("./resourceslice").ResourceState;
}>, import("@reduxjs/toolkit").AnyAction, undefined>]>;
export declare const exportConsumptionStore: import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<import("@reduxjs/toolkit").EmptyObject & {
    resource: import("./resourceslice").ResourceState;
}, import("@reduxjs/toolkit").AnyAction, [import("@reduxjs/toolkit").ThunkMiddleware<import("@reduxjs/toolkit").CombinedState<{
    resource: import("./resourceslice").ResourceState;
}>, import("@reduxjs/toolkit").AnyAction, undefined>]>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
export {};
