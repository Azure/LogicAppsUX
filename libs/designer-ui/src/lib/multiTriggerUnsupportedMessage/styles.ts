import { makeStyles, tokens } from '@fluentui/react-components';

export const useMultiTriggerUnsupportedMessageStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalM,
    maxWidth: '480px',
    textAlign: 'center',
    padding: tokens.spacingHorizontalXXL,
  },
  message: {
    color: tokens.colorNeutralForeground1,
  },
});
