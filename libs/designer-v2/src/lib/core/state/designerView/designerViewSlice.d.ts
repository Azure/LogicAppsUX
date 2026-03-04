import type { NodeContextMenuObject, EdgeContextMenuObject, DesignerViewState } from './designerViewInterfaces';
import type { PayloadAction } from '@reduxjs/toolkit';
export declare const initialState: DesignerViewState;
export declare const designerViewSlice: import("@reduxjs/toolkit").Slice<DesignerViewState, {
    toggleMinimap: (state: import("immer/dist/internal").WritableDraft<DesignerViewState>) => void;
    toggleClampPan: (state: import("immer/dist/internal").WritableDraft<DesignerViewState>) => void;
    setShowDeleteModalNodeId: (state: import("immer/dist/internal").WritableDraft<DesignerViewState>, action: PayloadAction<string | undefined>) => void;
    setNodeContextMenuData: (state: import("immer/dist/internal").WritableDraft<DesignerViewState>, action: PayloadAction<NodeContextMenuObject>) => void;
    setEdgeContextMenuData: (state: import("immer/dist/internal").WritableDraft<DesignerViewState>, action: PayloadAction<EdgeContextMenuObject>) => void;
    resetDesignerView: () => DesignerViewState;
}, "designerView">;
export declare const toggleMinimap: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"designerView/toggleMinimap">, toggleClampPan: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"designerView/toggleClampPan">, setShowDeleteModalNodeId: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string | undefined, "designerView/setShowDeleteModalNodeId">, setNodeContextMenuData: import("@reduxjs/toolkit").ActionCreatorWithPayload<NodeContextMenuObject, "designerView/setNodeContextMenuData">, setEdgeContextMenuData: import("@reduxjs/toolkit").ActionCreatorWithPayload<EdgeContextMenuObject, "designerView/setEdgeContextMenuData">, resetDesignerView: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"designerView/resetDesignerView">;
declare const _default: import("@reduxjs/toolkit").Reducer<DesignerViewState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
