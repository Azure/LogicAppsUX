import { memo, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import {
  Button,
  Card,
  ColorSwatch,
  makeStyles,
  mergeClasses,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  SwatchPicker,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import ReactMarkdown from 'react-markdown';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';

import type { AppDispatch } from '../../core';
import { deleteNote, updateNote } from '../../core/state/notes/notesSlice';
import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useNote } from '../../core/state/notes/notesSelectors';

import { bundleIcon, DeleteFilled, DeleteRegular, ColorFilled, ColorRegular } from '@fluentui/react-icons';

const DeleteIcon = bundleIcon(DeleteFilled, DeleteRegular);
const ColorIcon = bundleIcon(ColorFilled, ColorRegular);

const useStyles = makeStyles({
  noteCard: {
    position: 'relative',
    boxShadow: '0 0 2px rgba(0,0,0,0.24), 0 2px 4px rgba(0,0,0,0.28)',
    minWidth: '100px',
    minHeight: '44px',
    height: '100%',
    color: 'black',
    transition: 'background-color 0.2s ease',
  },
  noteTextarea: {
    margin: '-8px',
    height: '100%',
    maxHeight: 'none',
    '& > textarea': {
      padding: '7px 7px 5px',
      fieldSizing: 'content',
    },
  },
  reactMarkdown: {
    whiteSpace: 'pre-wrap',
  },
  markdownContainer: {
    height: '100%',
    overflow: 'auto',
    borderRadius: '4px',
  },
  markdownImage: {
    borderRadius: '4px',
    maxWidth: '100%',
  },
  markdownParagraph: {
    margin: 0,
  },
  dragHandle: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  noteToolbar: {
    position: 'absolute',
    bottom: '-32px',
    left: '0',
    margin: '-2px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '4px',
  },
});

const NoteNode = ({ id }: NodeProps) => {
  const intl = useIntl();
  const styles = useStyles();
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

const ColorButton = ({ id, selectedColor }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const isReadOnly = useReadOnly();
  const colorSelectCallback = useCallback(
    (_: any, e: any) => {
      if (isReadOnly) {
        return;
      }
      console.log('Selected color:', e);
      dispatch(updateNote({ id, note: { color: e.selectedValue } }));
    },
    [dispatch, id, isReadOnly]
  );

  const swatchColors = [
    '#FFFBCC', // Yellow
    '#CCE5FF', // Blue
    '#CCFFCC', // Green
    '#FFCCCC', // Red
    '#E0CCFF', // Purple
    '#FFFFFF', // White
  ];

  return (
    <Popover withArrow size="small" positioning="after">
      <PopoverTrigger>
        <Button icon={<ColorIcon />} appearance="transparent" size="small" />
      </PopoverTrigger>
      <PopoverSurface>
        <SwatchPicker shape="rounded" selectedValue={selectedColor} onSelectionChange={colorSelectCallback}>
          {swatchColors.map((color) => (
            <ColorSwatch key={color} color={color} value={color} borderColor={tokens.colorNeutralStroke1} />
          ))}
        </SwatchPicker>
      </PopoverSurface>
    </Popover>
  );
};
