import { makeStyles, tokens } from '@fluentui/react-components';

export const useMcpContainerStyles = makeStyles({
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    overflow: 'hidden',
    background: tokens.colorNeutralBackground1,
  },

  wizardArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: tokens.colorNeutralBackground1,
    minWidth: 0,
    position: 'relative',
    zIndex: 1,
  },
});
