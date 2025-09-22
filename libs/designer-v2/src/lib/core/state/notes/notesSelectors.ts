import type { RootState } from '../../store';
import type { NotesState } from './notesSlice';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

export const getNotesState = (state: RootState): NotesState => state.notes;

export const useNotes = () =>
	useSelector(createSelector(getNotesState, (state: NotesState) => state.notes));

export const useNote = (id: string) =>
	useSelector(createSelector(getNotesState, (state: NotesState) => state.notes[id]));

export const useIsNotesDirty = () =>
	useSelector(createSelector(getNotesState, (state: NotesState) => state.isDirty));
