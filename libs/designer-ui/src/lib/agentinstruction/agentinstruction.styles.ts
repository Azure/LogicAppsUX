import { makeStyles, shorthands } from '@fluentui/react-components';

export const useAgentInstructionStyles = makeStyles({
  editors: {
    ...shorthands.margin('10px', '0'),

    '& .msla-label': {
      maxHeight: '3em',
    },
  },

  systemEditor: {
    '&.editor-custom .editor-input': {
      minHeight: '90px',
      marginBottom: '10px',
    },

    '&.editor-custom .editor-placeholder': {
      marginTop: '-95px',
    },
  },

  editorWarning: {
    fontSize: '12px',
    marginTop: '20px',

    '& span': {
      whiteSpace: 'normal',
    },
  },
});
