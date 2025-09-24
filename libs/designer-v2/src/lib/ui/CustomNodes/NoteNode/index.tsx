import { memo, useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { Button, Card, mergeClasses, Textarea } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';

import type { AppDispatch } from '../../../core';
import { deleteNote, updateNote } from '../../../core/state/notes/notesSlice';
import { useReadOnly } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useNote } from '../../../core/state/notes/notesSelectors';

import { bundleIcon, DeleteFilled, DeleteRegular } from '@fluentui/react-icons';
import ColorButton from './NoteColorButton';
import { useNoteNodeStyles } from './NoteNode.styles';
import MarkdownRenderer from './NoteMarkdownRenderer';

const DeleteIcon = bundleIcon(DeleteFilled, DeleteRegular);

const NoteNode = ({ id, dragging }: NodeProps) => {
  const intl = useIntl();
  const styles = useNoteNodeStyles();
  const dispatch = useDispatch<AppDispatch>();

  const isReadOnly = useReadOnly();

  const noteData = useNote(id);

  const [isEditing, setIsEditing] = useState(false);

  const deleteCallback = useCallback(() => {
    if (isReadOnly) {
      return;
    }
    dispatch(deleteNote(id));
  }, [dispatch, id, isReadOnly]);

  const placeholderText = intl.formatMessage({
    defaultMessage: 'This is a note. You can use **Markdown** to format the text.',
    id: 'RO1UJU',
    description: 'Placeholder text for an empty note node',
  });

  const editClick = useCallback(
    (e: any) => {
      if (e.target.tagName === 'A') {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (isReadOnly) {
        return;
      }
      setIsEditing(true);
    },
    [isReadOnly]
  );

  const markdownContent = useMemo(
    () => (isUndefinedOrEmptyString(noteData?.content) ? `*${placeholderText}*` : noteData?.content || ''),
    [noteData?.content, placeholderText]
  );

  return (
    <>
      <Card
        className={mergeClasses(styles.noteCard, dragging && styles.draggingNote)}
        style={{
          backgroundColor: noteData?.color || '#FFFBCC',
          width: noteData?.metadata?.width ?? 200,
          resize: isReadOnly ? 'none' : 'horizontal',
        }}
      >
        {isEditing ? (
          <Textarea
            ref={(el) => el?.focus()} // This autofocuses when entering edit mode
            className={mergeClasses(styles.noteTextarea, 'nodrag')}
            placeholder={placeholderText}
            appearance="outline"
            value={noteData?.content || ''}
            onChange={(e) => {
              if (isReadOnly) {
                return;
              }
              dispatch(updateNote({ id, note: { content: e.target.value } }));
            }}
            onBlur={() => setIsEditing(false)}
          />
        ) : (
          <div className={mergeClasses(styles.markdownContainer, 'note-drag-handle')} onClick={editClick}>
            <MarkdownRenderer content={markdownContent} />
          </div>
        )}
      </Card>
      {/* Note Action Buttons */}
      {!isReadOnly && (
        <div className={styles.noteToolbar}>
          <ColorButton id={id} selectedColor={noteData?.color} />
          <Button icon={<DeleteIcon />} size="small" appearance="transparent" onClick={deleteCallback} />
        </div>
      )}
    </>
  );
};

NoteNode.displayName = 'NoteNode';

export default memo(NoteNode);
