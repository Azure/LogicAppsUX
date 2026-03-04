declare global {
    interface Window {
        __REDUX_ACTION_LOG__?: string[];
    }
}
export declare const store: import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<{
    dev?: import("./state/dev/devInterfaces").DevState;
    workflow: import("./state/workflow/workflowInterfaces").WorkflowState;
    operations: import("./state/operation/operationMetadataSlice").OperationMetadataState;
    panel: import("./state/panel/panelTypes").PanelState;
    connections: import("./state/connection/connectionSlice").ConnectionsStoreState;
    settings: import("./state/setting/settingInterface").SettingsState;
    designerOptions: import("./state/designerOptions/designerOptionsInterfaces").DesignerOptionsState;
    designerView: import("./state/designerView/designerViewInterfaces").DesignerViewState;
    tokens: import("./state/tokens/tokensSlice").TokensState;
    workflowParameters: import("./state/workflowparameters/workflowparametersSlice").WorkflowParametersState;
    staticResults: import("./state/staticresultschema/staticresultsSlice").StaticResultsState;
    unitTest: import("./state/unitTest/unitTestInterfaces").UnitTestState;
    customCode: import("./state/customcode/customcodeInterfaces").CustomCodeState;
    undoRedo: import("./state/undoRedo/undoRedoTypes").StateHistory;
    modal: import("./state/modal/modalSlice").ModalState;
    notes: import("./state/notes/notesSlice").NotesState;
}, import("@reduxjs/toolkit").AnyAction, import("@reduxjs/toolkit").MiddlewareArray<[import("redux-thunk").ThunkMiddleware<{
    dev?: import("./state/dev/devInterfaces").DevState;
    workflow: import("./state/workflow/workflowInterfaces").WorkflowState;
    operations: import("./state/operation/operationMetadataSlice").OperationMetadataState;
    panel: import("./state/panel/panelTypes").PanelState;
    connections: import("./state/connection/connectionSlice").ConnectionsStoreState;
    settings: import("./state/setting/settingInterface").SettingsState;
    designerOptions: import("./state/designerOptions/designerOptionsInterfaces").DesignerOptionsState;
    designerView: import("./state/designerView/designerViewInterfaces").DesignerViewState;
    tokens: import("./state/tokens/tokensSlice").TokensState;
    workflowParameters: import("./state/workflowparameters/workflowparametersSlice").WorkflowParametersState;
    staticResults: import("./state/staticresultschema/staticresultsSlice").StaticResultsState;
    unitTest: import("./state/unitTest/unitTestInterfaces").UnitTestState;
    customCode: import("./state/customcode/customcodeInterfaces").CustomCodeState;
    undoRedo: import("./state/undoRedo/undoRedoTypes").StateHistory;
    modal: import("./state/modal/modalSlice").ModalState;
    notes: import("./state/notes/notesSlice").NotesState;
}, import("@reduxjs/toolkit").AnyAction, undefined>, import("@reduxjs/toolkit").Middleware<{}, any, import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction>>]>>;
export default store;
export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
