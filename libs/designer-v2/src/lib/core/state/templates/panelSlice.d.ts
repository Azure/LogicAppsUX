import type { PayloadAction } from '@reduxjs/toolkit';
export declare const TemplatePanelView: {
    readonly QuickView: "quickView";
    readonly CreateWorkflow: "createWorkflow";
    readonly ConfigureWorkflows: "configureWorkflows";
    readonly EditWorkflows: "editWorkflows";
    readonly CustomizeParameter: "customizeParameter";
};
export type ConfigPanelView = (typeof TemplatePanelView)[keyof typeof TemplatePanelView];
export interface PanelState {
    isOpen: boolean;
    currentPanelView?: ConfigPanelView;
    selectedTabId: string | undefined;
}
declare const initialState: PanelState;
export declare const panelSlice: import("@reduxjs/toolkit").Slice<PanelState, {
    openPanelView: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<{
        panelView: ConfigPanelView;
        selectedTabId?: string;
    }>) => void;
    selectPanelTab: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string | undefined>) => void;
    closePanel: (state: typeof initialState) => void;
}, "panel">;
export declare const openPanelView: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    panelView: ConfigPanelView;
    selectedTabId?: string | undefined;
}, "panel/openPanelView">, selectPanelTab: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string | undefined, "panel/selectPanelTab">, closePanel: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"panel/closePanel">;
declare const _default: import("@reduxjs/toolkit").Reducer<PanelState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
