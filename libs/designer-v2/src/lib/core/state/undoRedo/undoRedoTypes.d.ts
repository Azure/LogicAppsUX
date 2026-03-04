import type { RootState } from '../../store';
export interface StateHistory {
    past: StateHistoryItem[];
    future: StateHistoryItem[];
    undoRedoClickToggle: number;
    currentEditedPanelTab?: string;
    currentEditedPanelNode?: string;
}
export interface StateHistoryItem {
    compressedState: Uint8Array;
    editedPanelTab?: string;
    editedPanelNode?: string;
}
export type UndoRedoPartialRootState = Pick<RootState, 'connections' | 'customCode' | 'operations' | 'panel' | 'settings' | 'staticResults' | 'tokens' | 'workflow' | 'workflowParameters' | 'notes'>;
export declare const undoableWorkflowActionTypes: string[];
export declare const undoablePanelActionTypes: string[];
export declare const undoableActionTypes: string[];
