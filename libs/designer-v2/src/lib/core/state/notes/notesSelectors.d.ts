import type { RootState } from '../../store';
import type { NotesState } from './notesSlice';
export declare const getNotesState: (state: RootState) => NotesState;
export declare const useNotes: () => Record<string, import("../../..").Note>;
export declare const useNote: (id: string) => import("../../..").Note;
export declare const useIsNotesDirty: () => boolean;
export declare const useNotesChangeCount: () => number;
