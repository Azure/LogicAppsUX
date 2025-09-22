import { memo, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { Button, Card, mergeClasses, Textarea } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import ReactMarkdown from 'react-markdown';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';

import type { AppDispatch } from '../../../core';
import { deleteNote, updateNote } from '../../../core/state/notes/notesSlice';
import { useReadOnly } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useNote } from '../../../core/state/notes/notesSelectors';

import { bundleIcon, DeleteFilled, DeleteRegular } from '@fluentui/react-icons';
import ColorButton from './ColorButton';
import { useNoteNodeStyles } from './NoteNode.styles';

const DeleteIcon = bundleIcon(DeleteFilled, DeleteRegular);

const NoteNode = ({ id }: NodeProps) => {
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

  const markdownRenderers = {
    img: (props: any) => <img {...props} className={styles.markdownImage} />,
    p: (props: any) => <p {...props} className={styles.markdownParagraph} />,
  };

  return (
    <div style={{ zIndex: '-1' }}>
      <Card
        className={styles.noteCard}
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
          <div className={styles.markdownContainer}>
            <ReactMarkdown className={styles.reactMarkdown} components={markdownRenderers}>
              {isUndefinedOrEmptyString(noteData?.content) ? `*${placeholderText}*` : noteData?.content}
            </ReactMarkdown>
          </div>
        )}
        {/* Drag handle */}
        {!isEditing && !isReadOnly && (
          <div
            className={mergeClasses(styles.dragHandle, 'note-drag-handle')}
            onClick={(e: any) => {
              e.preventDefault();
              e.stopPropagation();
              if (isReadOnly) {
                return;
              }
              setIsEditing(true);
            }}
          />
        )}
        {/* Buttons */}
      </Card>
      {!isReadOnly && (
        <div className={styles.noteToolbar}>
          <ColorButton id={id} selectedColor={noteData?.color} />
          <Button icon={<DeleteIcon />} size="small" appearance="transparent" onClick={deleteCallback} />
        </div>
      )}
    </div>
  );
};

NoteNode.displayName = 'NoteNode';

export default memo(NoteNode);
