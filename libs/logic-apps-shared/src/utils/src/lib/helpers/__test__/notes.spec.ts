import { describe, it, expect } from 'vitest';
import { DEFAULT_NOTE_COLOR, DEFAULT_NOTE_SIZE, mergeDesignerNotes, sanitizeNotes } from '../notes';

describe('lib/helpers/notes', () => {
  describe('sanitizeNotes', () => {
    it('returns an empty record for non-object input', () => {
      expect(sanitizeNotes(undefined)).toEqual({});
      expect(sanitizeNotes(null)).toEqual({});
      expect(sanitizeNotes('notes')).toEqual({});
      expect(sanitizeNotes([{ content: 'a' }])).toEqual({});
    });

    it('keeps well-formed notes untouched', () => {
      const notes = {
        note1: {
          content: 'Hello',
          color: '#FFFFFF',
          metadata: { position: { x: -350, y: 120 }, width: 300, height: 200 },
        },
      };
      expect(sanitizeNotes(notes)).toEqual(notes);
    });

    // https://github.com/Azure/LogicAppsUX/issues/9466
    it('drops user-authored metadata that is not a note', () => {
      expect(
        sanitizeNotes({
          purpose: 'Poll Microsoft Entra ID Protection risk detections.',
          owner: { team: 'identity' },
          tags: ['a', 'b'],
          count: 4,
          nothing: null,
        })
      ).toEqual({});
    });

    it('keeps valid notes alongside foreign metadata', () => {
      const sanitized = sanitizeNotes({
        purpose: 'Some user-authored string',
        note1: { content: 'Real note', color: '#FF0000', metadata: { position: { x: 1, y: 2 }, width: 10, height: 20 } },
      });
      expect(Object.keys(sanitized)).toEqual(['note1']);
    });

    it('fills in defaults for partial notes', () => {
      expect(sanitizeNotes({ note1: { content: 'Partial' } })).toEqual({
        note1: {
          content: 'Partial',
          color: DEFAULT_NOTE_COLOR,
          metadata: {
            position: { x: 0, y: 0 },
            width: DEFAULT_NOTE_SIZE.width,
            height: DEFAULT_NOTE_SIZE.height,
          },
        },
      });
    });

    it('replaces non-finite or non-numeric dimensions with defaults', () => {
      const sanitized = sanitizeNotes({
        note1: {
          content: 'Bad numbers',
          metadata: { position: { x: Number.NaN, y: '12' }, width: null, height: Number.POSITIVE_INFINITY },
        },
      });
      expect(sanitized['note1'].metadata).toEqual({
        position: { x: 0, y: 0 },
        width: DEFAULT_NOTE_SIZE.width,
        height: DEFAULT_NOTE_SIZE.height,
      });
    });
  });

  describe('mergeDesignerNotes', () => {
    const designerNote = {
      content: 'Real note',
      color: DEFAULT_NOTE_COLOR,
      metadata: { position: { x: 1, y: 2 }, width: 10, height: 20 },
    };

    // https://github.com/Azure/LogicAppsUX/issues/9466 - saving must not delete metadata the
    // designer never owned.
    it('preserves foreign entries that sanitizeNotes drops', () => {
      const merged = mergeDesignerNotes(
        {
          purpose: 'Poll Microsoft Entra ID Protection risk detections.',
          owner: { team: 'identity' },
          note1: { content: 'Stale content' },
        },
        { note1: designerNote }
      );

      expect(merged).toEqual({
        purpose: 'Poll Microsoft Entra ID Protection risk detections.',
        owner: { team: 'identity' },
        note1: designerNote,
      });
    });

    it('drops designer notes that are no longer present', () => {
      const merged = mergeDesignerNotes({ purpose: 'keep me', note1: { content: 'Deleted note' } }, {});
      expect(merged).toEqual({ purpose: 'keep me' });
    });

    it('handles missing or non-object existing notes', () => {
      expect(mergeDesignerNotes(undefined, { note1: designerNote })).toEqual({ note1: designerNote });
      expect(mergeDesignerNotes('nope', {})).toEqual({});
    });
  });
});
