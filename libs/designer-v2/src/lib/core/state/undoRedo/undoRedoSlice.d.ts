import { type PayloadAction } from '@reduxjs/toolkit';
import type { StateHistory, StateHistoryItem } from './undoRedoTypes';
export declare const initialState: StateHistory;
export declare const undoRedoSlice: import("@reduxjs/toolkit").Slice<StateHistory, {
    saveStateToHistory: (state: import("immer/dist/internal").WritableDraft<StateHistory>, action: PayloadAction<{
        stateHistoryItem: StateHistoryItem;
        limit: number;
    }>) => void;
    updateStateHistoryOnUndoClick: (state: import("immer/dist/internal").WritableDraft<StateHistory>, action: PayloadAction<StateHistoryItem>) => void;
    updateStateHistoryOnRedoClick: (state: import("immer/dist/internal").WritableDraft<StateHistory>, action: PayloadAction<StateHistoryItem>) => void;
}, "undoRedo">;
export declare const saveStateToHistory: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    stateHistoryItem: StateHistoryItem;
    limit: number;
}, "undoRedo/saveStateToHistory">, updateStateHistoryOnUndoClick: import("@reduxjs/toolkit").ActionCreatorWithPayload<StateHistoryItem, "undoRedo/updateStateHistoryOnUndoClick">, updateStateHistoryOnRedoClick: import("@reduxjs/toolkit").ActionCreatorWithPayload<StateHistoryItem, "undoRedo/updateStateHistoryOnRedoClick">;
declare const _default: import("@reduxjs/toolkit").Reducer<StateHistory, import("@reduxjs/toolkit").AnyAction>;
export default _default;
