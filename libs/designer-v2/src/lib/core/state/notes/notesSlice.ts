import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import { resetWorkflowState, setStateAfterUndoRedo } from '../global';
import type { UndoRedoPartialRootState } from '../undoRedo/undoRedoTypes';
import { type DeepPartial, DEFAULT_NOTE_COLOR, DEFAULT_NOTE_SIZE, guid, sanitizeNotes } from '@microsoft/logic-apps-shared';
import type { XYPosition } from '@xyflow/react';
import type { Note } from '../../../common/models/workflow';

export interface NotesState {
  notes: Record<string, Note>;
  isDirty: boolean;
  changeCount: number;
}

export const initialState: NotesState = {
  notes: {},
  isDirty: false,
  changeCount: 0,
};

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    initializeNotes: (state, action: PayloadAction<Record<string, Note> | undefined>) => {
      // `definition.metadata.notes` is user-writable and may hold arbitrary content, so anything
      // that isn't a well-formed note is dropped here rather than crashing the designer on load.
      state.notes = sanitizeNotes(action.payload);
    },
    addNote: (state, action: PayloadAction<XYPosition>) => {
      state.notes[guid()] = {
        content: '',
        color: DEFAULT_NOTE_COLOR,
        metadata: {
          position: action.payload,
          width: DEFAULT_NOTE_SIZE.width,
          height: DEFAULT_NOTE_SIZE.height,
        },
      };
    },
    updateNote: (state, action: PayloadAction<{ id: string; note: DeepPartial<Note> }>) => {
      const note = state.notes[action.payload.id];
      if (!note) {
        return;
      }
      if (action.payload.note?.color) {
        note.color = action.payload.note.color;
      }
      if (action.payload.note?.content !== undefined) {
        note.content = action.payload.note.content;
      }
      if (action.payload.note?.metadata) {
        if (!note.metadata) {
          note.metadata = { position: { x: 0, y: 0 }, width: DEFAULT_NOTE_SIZE.width, height: DEFAULT_NOTE_SIZE.height };
        }
        if (action.payload.note.metadata.position) {
          const existing = note.metadata.position;
          const pos = action.payload.note.metadata.position;
          note.metadata.position = {
            x: pos.x ?? existing.x,
            y: pos.y ?? existing.y,
          };
        }
        if (action.payload.note.metadata.width) {
          note.metadata.width = action.payload.note.metadata.width;
        }
        if (action.payload.note.metadata.height) {
          note.metadata.height = action.payload.note.metadata.height;
        }
      }
    },
    deleteNote: (state, action: PayloadAction<string>) => {
      delete state.notes[action.payload];
    },
    resetNoteDirty: (state, action: PayloadAction<boolean>) => {
      state.isDirty = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
    builder.addCase(setStateAfterUndoRedo, (_, action: PayloadAction<UndoRedoPartialRootState>) => action.payload.notes);
    builder.addMatcher(isAnyOf(addNote, updateNote, deleteNote), (state) => {
      state.isDirty = true;
      state.changeCount += 1;
    });
  },
});

export const { initializeNotes, addNote, updateNote, deleteNote, resetNoteDirty } = notesSlice.actions;
export default notesSlice.reducer;
