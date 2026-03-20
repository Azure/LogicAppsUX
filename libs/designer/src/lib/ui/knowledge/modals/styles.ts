import { makeStyles, tokens } from '@fluentui/react-components';

export const useModalStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: tokens.spacingVerticalL,
  },

  groupContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXL,
  },

  actions: {
    paddingTop: tokens.spacingVerticalL,
  },

  groupSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
});
