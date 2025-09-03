import { makeStyles, tokens } from '@fluentui/react-components';

export const useSearchableDropdownStyles = makeStyles({
  root: {
    width: '100%',
  },
  noResults: {
    padding: '8px',
    fontStyle: 'italic',
    color: tokens.colorNeutralForeground3,
  },
});
