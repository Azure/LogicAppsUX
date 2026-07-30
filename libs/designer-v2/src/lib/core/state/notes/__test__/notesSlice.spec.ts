import { describe, it, expect } from 'vitest';
import reducer, { initialState, initializeNotes, updateNote, deleteNote } from '../notesSlice';
import type { NotesState } from '../notesSlice';
import type { Note } from '../../../../common/models/workflow';

const buildNote = (overrides: Partial<Note> = {}): Note => ({
  content: 'A note',
  color: '#FFFBCC',
  metadata: { position: { x: 10, y: 20 }, width: 200, height: 140 },
  ...overrides,
});

describe('notesSlice', () => {
  describe('initializeNotes', () => {
    it('loads well-formed notes', () => {
      const notes = { note1: buildNote() };
      const state = reducer(initialState, initializeNotes(notes));
      expect(state.notes).toEqual(notes);
    });

    // https://github.com/Azure/LogicAppsUX/issues/9466 - `definition.metadata.notes` can hold
    // arbitrary user-authored content which used to crash the designer on load.
    it('drops entries that are not notes', () => {
      const state = reducer(
        initialState,
        initializeNotes({
          purpose: 'Poll Microsoft Entra ID Protection risk detections.',
        } as any)
      );
      expect(state.notes).toEqual({});
    });

    it('handles an undefined payload', () => {
      const state = reducer({ ...initialState, notes: { note1: buildNote() } }, initializeNotes(undefined));
      expect(state.notes).toEqual({});
    });

    it('backfills missing metadata so position updates cannot crash', () => {
      const state = reducer(initialState, initializeNotes({ note1: { content: 'No metadata' } as any }));
      expect(state.notes['note1'].metadata.position).toEqual({ x: 0, y: 0 });

      const updated = reducer(state, updateNote({ id: 'note1', note: { metadata: { position: { x: 5, y: 6 } } } }));
      expect(updated.notes['note1'].metadata.position).toEqual({ x: 5, y: 6 });
    });
  });

  describe('updateNote', () => {
    const stateWithNote = (): NotesState => ({ ...initialState, notes: { note1: buildNote() } });

    it('merges partial positions with the existing position', () => {
      const state = reducer(stateWithNote(), updateNote({ id: 'note1', note: { metadata: { position: { x: 99 } } } }));
      expect(state.notes['note1'].metadata.position).toEqual({ x: 99, y: 20 });
    });

    it('ignores updates for unknown notes', () => {
      const state = reducer(stateWithNote(), updateNote({ id: 'missing', note: { metadata: { position: { x: 1, y: 2 } } } }));
      expect(state.notes['missing']).toBeUndefined();
    });

    it('does not mark the workflow dirty when the note is unknown', () => {
      const state = reducer(stateWithNote(), updateNote({ id: 'missing', note: { metadata: { position: { x: 1, y: 2 } } } }));
      expect(state.isDirty).toBe(false);
      expect(state.changeCount).toBe(0);
    });

    it('marks the workflow dirty when the note exists', () => {
      const state = reducer(stateWithNote(), updateNote({ id: 'note1', note: { content: 'Updated' } }));
      expect(state.isDirty).toBe(true);
      expect(state.changeCount).toBe(1);
    });

    it('does not throw when the stored note has no metadata', () => {
      const state: NotesState = { ...initialState, notes: { note1: { content: 'x', color: '#FFF' } as Note } };
      expect(() => reducer(state, updateNote({ id: 'note1', note: { metadata: { position: { x: 1, y: 2 } } } }))).not.toThrow();
    });
  });

  describe('deleteNote', () => {
    it('removes the note', () => {
      const state = reducer({ ...initialState, notes: { note1: buildNote() } }, deleteNote('note1'));
      expect(state.notes).toEqual({});
    });
  });
});
