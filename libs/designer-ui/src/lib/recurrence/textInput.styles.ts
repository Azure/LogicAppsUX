import { makeStyles, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  labelContainer: {
    marginBottom: tokens.spacingVerticalXS,
  },
  fieldWrapper: {
    display: 'inline-flex',
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
  },
});
