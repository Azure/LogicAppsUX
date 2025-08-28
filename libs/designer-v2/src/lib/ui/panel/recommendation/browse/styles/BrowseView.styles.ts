import { makeStyles, tokens } from '@fluentui/react-components';

export const useBrowseViewStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: tokens.spacingVerticalL,
  },
});
