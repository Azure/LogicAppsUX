import { makeStyles, tokens } from '@fluentui/react-components';

export const useModalStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: tokens.spacingVerticalL,
  },
});
