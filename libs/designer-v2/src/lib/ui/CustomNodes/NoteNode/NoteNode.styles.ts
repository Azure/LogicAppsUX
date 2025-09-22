import { makeStyles } from '@fluentui/react-components';

export const useNoteNodeStyles = makeStyles({
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
