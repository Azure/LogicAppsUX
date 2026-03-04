import { type DeepPartial } from '@microsoft/logic-apps-shared';
import type { XYPosition } from '@xyflow/react';
import type { Note } from '../../../common/models/workflow';
export interface NotesState {
    notes: Record<string, Note>;
    isDirty: boolean;
    changeCount: number;
}
export declare const initializeNotes: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, Note>, "notes/initializeNotes">, addNote: import("@reduxjs/toolkit").ActionCreatorWithPayload<XYPosition, "notes/addNote">, updateNote: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    note: DeepPartial<Note>;
}, "notes/updateNote">, deleteNote: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "notes/deleteNote">, resetNoteDirty: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "notes/resetNoteDirty">;
declare const _default: import("@reduxjs/toolkit").Reducer<NotesState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
