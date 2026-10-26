import { makeStyles, tokens } from '@fluentui/react-components';

export const useMultiTriggerUnsupportedMessageStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: tokens.spacingHorizontalXXL,
    boxSizing: 'border-box',
  },
  content: {
    width: '100%',
    maxWidth: '480px',
  },
});
