import { makeStyles, shorthands } from '@fluentui/react-components';

export const useConnectionTypeSelectorStyles = makeStyles({
  cardConnectiontypeselector: {
    '& label': {
      ...shorthands.margin('10px'),
    },
  },

  cardConnectiontypeselectorLoading: {
    ...shorthands.margin('10px'),
    lineHeight: '45px',
  },
});
