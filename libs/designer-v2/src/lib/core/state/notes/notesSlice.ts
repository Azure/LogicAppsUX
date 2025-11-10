import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import { resetWorkflowState, setStateAfterUndoRedo } from '../global';
import type { UndoRedoPartialRootState } from '../undoRedo/undoRedoTypes';
import { type DeepPartial, guid } from '@microsoft/logic-apps-shared';
import type { XYPosition } from '@xyflow/react';
import { DEFAULT_NOTE_SIZE } from '../../../core/utils/graph';
import type { Note } from '../../../common/models/workflow';

export interface NotesState {
  notes: Record<string, Note>;
  isDirty: boolean;
  changeCount: number;
}

const initialState: NotesState = {
  notes: {},
  isDirty: false,
  changeCount: 0,
};

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    initializeNotes: (state, action: PayloadAction<Record<string, Note>>) => {
      state.notes = action.payload;
    },
    addNote: (state, action: PayloadAction<XYPosition>) => {
      state.notes[guid()] = {
        content: '',
        color: '#FFFBCC',
        metadata: {
          position: action.payload,
          width: DEFAULT_NOTE_SIZE.width,
          height: DEFAULT_NOTE_SIZE.height,
        },
      };
    },
    updateNote: (state, action: PayloadAction<{ id: string; note: DeepPartial<Note> }>) => {
      if (action.payload.note?.color) {
        state.notes[action.payload.id].color = action.payload.note.color;
      }
      if (action.payload.note?.content !== undefined) {
        state.notes[action.payload.id].content = action.payload.note.content;
      }
      if (action.payload.note?.metadata) {
        if (action.payload.note.metadata.position) {
          const existing = state.notes[action.payload.id].metadata.position;
          const pos = action.payload.note.metadata.position;
          state.notes[action.payload.id].metadata.position = {
            x: pos.x ?? existing.x,
            y: pos.y ?? existing.y,
          };
        }
        if (action.payload.note.metadata.width) {
          state.notes[action.payload.id].metadata.width = action.payload.note.metadata.width;
        }
        if (action.payload.note.metadata.height) {
          state.notes[action.payload.id].metadata.height = action.payload.note.metadata.height;
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
