import { type UndoRedoPartialRootState } from '../state/undoRedo/undoRedoTypes';
import type { RootState } from '../store';
import type { AnyAction } from '@reduxjs/toolkit';
export declare const getCompressedStateFromRootState: (rootState: RootState) => Uint8Array;
export declare const getRootStateFromCompressedState: (compressedState: Uint8Array) => UndoRedoPartialRootState;
export declare const getEditedPanelTab: (actionType: string) => string | undefined;
export declare const getEditedPanelNode: (actionType: string, rootState: RootState) => string | undefined;
export declare const shouldSkipSavingStateToHistory: (action: AnyAction, stateHistoryLimit: number, idReplacements: Record<string, string>) => boolean;
