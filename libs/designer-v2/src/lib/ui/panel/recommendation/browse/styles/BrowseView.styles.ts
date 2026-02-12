import { makeStyles, tokens } from '@fluentui/react-components';

export const useBrowseViewStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    border: '2px solid red',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: tokens.spacingVerticalL,
  },
  wizardWrapper: {
    height: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
  },
});
