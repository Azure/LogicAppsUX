import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useSchemaEditorStyles = makeStyles({
  schemaEditorBody: {
    '& .msla-monaco': {
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
      width: '100%',
    },
  },

  schemaEditorOperations: {
    display: 'flex',
    alignItems: 'center',
  },

  schemaEditorErrorMessage: {
    marginLeft: 'auto',
    color: 'rgb(224, 2, 2)',
    fontSize: '14px',
  },

  schemaEditorModalBody: {
    overflow: 'hidden',
    paddingBottom: '2px', // Add padding to prevent border cutoff

    '& .msla-monaco': {
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
      textAlign: 'left',
      width: '100%',
      boxSizing: 'border-box',
    },
  },

  schemaCardButton: {
    // Styles for the button if needed
  },
});
