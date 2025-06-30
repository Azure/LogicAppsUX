import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useCodeEditorStyles = makeStyles({
  codeEditorBody: {
    position: 'relative',
    paddingBottom: '30px',

    '& .msla-monaco': {
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
      width: '100%',
    },

    '& .monaco-editor .suggest-widget': {
      zIndex: '120', // Keeps the completion provider higher than the token picker
    },
  },

  customCodeEditorBody: {
    position: 'relative',
    paddingBottom: '30px',

    '& .msla-monaco': {
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
      width: '100%',
    },

    '& .monaco-editor .suggest-widget': {
      zIndex: '120', // Keeps the completion provider higher than the token picker
    },
  },

  customCodeEditorFile: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
  },

  customCodeEditorFileName: {
    color: '#0078d4',
    fontSize: '14px',
  },

  customCodeEditorMessageBar: {
    marginTop: '30px',
  },

  codeEditorErrors: {
    '& .msla-input-parameter-error.msla-label': {
      marginLeft: '0px',
    },
  },
});
