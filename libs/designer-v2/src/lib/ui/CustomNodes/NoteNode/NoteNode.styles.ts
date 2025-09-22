import { makeStyles } from '@fluentui/react-components';

export const useNoteNodeStyles = makeStyles({
  noteCard: {
    position: 'relative',
    boxShadow: '0 0 2px rgba(0,0,0,0.24), 0 2px 4px rgba(0,0,0,0.28)',
    minWidth: '100px',
    minHeight: '44px',
    height: '100%',
    color: 'black',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
  },
  draggingNote: {
    boxShadow: '0 0 2px rgba(0,0,0,0.24), 0 8px 16px rgba(0,0,0,0.28)',
    '& iframe': {
      pointerEvents: 'none',
    },
  },
  noteTextarea: {
    margin: '-8px',
    height: '100%',
    '& > textarea': {
      padding: '7px 7px 5px',
      fieldSizing: 'content',
      maxHeight: 'none !important',
    },
  },
  reactMarkdown: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: '20px',
    wordBreak: 'break-all',
  },
  markdownContainer: {
    height: '100%',
    overflow: 'auto',
    borderRadius: '4px',
    margin: '-12px',
    padding: '12px',
  },
  markdownImage: {
    borderRadius: '4px',
    maxWidth: '100%',
  },
  markdownHeading: {
    margin: '2px 0px 0px',
  },
  markdownParagraph: {
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  markdownList: {
    margin: '0px',
    paddingLeft: '24px',
  },
  markdownEmbed: {
    maxWidth: '100%',
    border: 'none',
    background: '#00000020',
    borderRadius: '4px',
    aspectRatio: '16 / 9',
    overflow: 'hidden',
    // pointerEvents: 'none',
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
