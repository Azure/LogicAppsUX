import type { Note } from '../models/workflow';

export const DEFAULT_NOTE_SIZE = {
  width: 200,
  height: 140,
};

export const DEFAULT_NOTE_COLOR = '#FFFBCC';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toFiniteNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

// A note always serializes with a string `content`; anything else is foreign metadata.
const isNoteLike = (value: unknown): value is Record<string, unknown> & { content: string } =>
  isPlainObject(value) && typeof value['content'] === 'string';

/**
 * Normalizes an untrusted `notes` record into designer notes.
 *
 * Designer notes are persisted under `definition.metadata.notes`, a location that predates the
 * feature and may already hold arbitrary user-authored content. Entries that don't look like a
 * note are dropped, and partial notes are filled in with defaults, so downstream code can rely on
 * `content`, `color` and `metadata` always being present.
 */
export const sanitizeNotes = (notes: unknown): Record<string, Note> => {
  if (!isPlainObject(notes)) {
    return {};
  }

  const sanitized: Record<string, Note> = {};
  for (const [id, value] of Object.entries(notes)) {
    if (!isNoteLike(value)) {
      continue;
    }

    const rawMetadata = value['metadata'];
    const metadata = isPlainObject(rawMetadata) ? rawMetadata : {};
    const rawPosition = metadata['position'];
    const position = isPlainObject(rawPosition) ? rawPosition : {};
    const color = value['color'];

    sanitized[id] = {
      content: value['content'],
      color: typeof color === 'string' ? color : DEFAULT_NOTE_COLOR,
      metadata: {
        position: {
          x: toFiniteNumber(position['x'], 0),
          y: toFiniteNumber(position['y'], 0),
        },
        width: toFiniteNumber(metadata['width'], DEFAULT_NOTE_SIZE.width),
        height: toFiniteNumber(metadata['height'], DEFAULT_NOTE_SIZE.height),
      },
    };
  }

  return sanitized;
};

/**
 * Merges designer notes back into an untrusted `notes` record for persistence.
 *
 * `sanitizeNotes` drops entries that aren't well-formed notes, so writing the designer's notes
 * straight back over `definition.metadata.notes` would silently delete that foreign content.
 * Foreign entries are carried over untouched, while designer notes the user deleted are dropped
 * because they were well-formed on load and are absent from `designerNotes`.
 */
export const mergeDesignerNotes = (existingNotes: unknown, designerNotes: Record<string, Note>): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};

  if (isPlainObject(existingNotes)) {
    for (const [id, value] of Object.entries(existingNotes)) {
      if (!isNoteLike(value)) {
        merged[id] = value;
      }
    }
  }

  return { ...merged, ...designerNotes };
};
