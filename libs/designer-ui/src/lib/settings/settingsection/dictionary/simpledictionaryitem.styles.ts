import { makeStyles, tokens, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 32px',
    gap: tokens.spacingHorizontalS,
    width: '100%',
    alignItems: 'center',
  },
  fieldWrapper: {
    ...shorthands.padding(tokens.spacingVerticalXS, '0'),
    minWidth: 0, // Allows flex items to shrink below their content size
    width: '100%',
  },
  deleteButton: {
    alignSelf: 'center',
    justifySelf: 'end',
    minWidth: '32px',
  },
});
