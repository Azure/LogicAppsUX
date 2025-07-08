import { makeStyles, shorthands } from '@fluentui/react-components';

export const useSearchableDropdownStyles = makeStyles({
  searchableDropdown: {
    ...shorthands.margin('24px', 'auto', '0', 'auto'),
  },

  searchableDropdownSearch: {
    ...shorthands.margin('10px'),
  },
});
