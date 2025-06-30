import { makeStyles, shorthands } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

export const useRecurrenceStyles = makeStyles({
  editor: {
    flex: '1 1 auto',
    ...shorthands.border('1px', 'dashed', designTokens.colors.defaultBorderColor),
    ...shorthands.padding('0', '10px', '10px', '10px'),
  },

  frequencyGroup: {
    display: 'flex',
    width: '100%',
  },

  editorGroup: {
    width: '50%',
  },

  intervalGroup: {
    width: '50%',
    marginRight: '10px',
  },

  preview: {
    ...shorthands.border('1px', 'dashed', '#000'),
    backgroundColor: '#e9e9f3',
    marginBottom: '6px',
    marginTop: '10px',
    ...shorthands.padding('6px'),
  },

  previewDark: {
    backgroundColor: '#383838',
  },

  previewTitle: {
    fontSize: '14px',
    fontWeight: '600',
  },

  previewContent: {
    // Container for preview content
  },

  friendlyDesc: {
    wordBreak: 'break-all',
    display: 'inline-block',
    marginRight: '6px',
  },

  warningMessage: {
    fontStyle: 'italic',
  },
});
