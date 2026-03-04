import type { PayloadAction } from '@reduxjs/toolkit';
export declare const McpPanelView: {
    readonly SelectConnector: "selectConnector";
    readonly SelectOperation: "selectOperation";
    readonly UpdateOperation: "updateOperation";
    readonly CreateConnection: "createConnection";
    readonly EditOperation: "editOperation";
};
export type ConfigPanelView = (typeof McpPanelView)[keyof typeof McpPanelView];
export interface PanelState {
    isOpen: boolean;
    currentPanelView?: ConfigPanelView;
    selectedTabId?: string;
}
declare const initialState: PanelState;
export declare const mcpPanelSlice: import("@reduxjs/toolkit").Slice<PanelState, {
    openConnectorPanelView: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<{
        panelView: ConfigPanelView;
        selectedTabId?: string;
    }>) => void;
    openOperationPanelView: (state: import("immer/dist/internal").WritableDraft<PanelState>) => void;
    selectPanelTab: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string | undefined>) => void;
    closePanel: (state: typeof initialState) => void;
}, "mcpPanel">;
export declare const openConnectorPanelView: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    panelView: ConfigPanelView;
    selectedTabId?: string | undefined;
}, "mcpPanel/openConnectorPanelView">, openOperationPanelView: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"mcpPanel/openOperationPanelView">, selectPanelTab: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string | undefined, "mcpPanel/selectPanelTab">, closePanel: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"mcpPanel/closePanel">;
declare const _default: import("@reduxjs/toolkit").Reducer<PanelState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
