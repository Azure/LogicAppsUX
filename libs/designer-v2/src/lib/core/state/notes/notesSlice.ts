import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetWorkflowState, setStateAfterUndoRedo } from '../global';
import type { UndoRedoPartialRootState } from '../undoRedo/undoRedoTypes';
import { type DeepPartial, guid } from '@microsoft/logic-apps-shared';
import type { XYPosition } from '@xyflow/react';
import { DEFAULT_NOTE_SIZE } from '../../../core/utils/graph';

export interface NotesState {
	notes: Record<string, Note>;
	isDirty: boolean;
}

export type Note = {
	content: string;
	color: string;
	metadata: {
		position: XYPosition;
		width: number;
		height: number;
	}
};

const initialState: NotesState = {
	notes: {},
	isDirty: false,
};

const notesSlice = createSlice({
	name: 'notes',
	initialState,
	reducers: {
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
	},
	extraReducers: (builder) => {
		builder.addCase(resetWorkflowState, () => initialState);
		builder.addCase(setStateAfterUndoRedo, (_, action: PayloadAction<UndoRedoPartialRootState>) => action.payload.notes);
		builder.addDefaultCase((state) => {
			state.isDirty = true;
		});
	},
});

export const { addNote, updateNote, deleteNote } = notesSlice.actions;
export default notesSlice.reducer;
