import { makeStyles, shorthands } from '@fluentui/react-components';

export const useTemplateSearchFiltersStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: 'calc(343px * 4 + 24px * 3)', // 4 cards + 3 gaps
    ...shorthands.margin('0', 'auto'),
    ...shorthands.padding('0'),
  },

  searchBoxContainer: {
    width: '100%',
    marginBottom: '16px',
    paddingLeft: '0',
  },

  searchBox: {
    width: '100%',
    ...shorthands.borderRadius('4px'),
  },

  filtersDropdowns: {
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    marginBottom: '16px',
    width: '100%',
    '& > *': {
      flex: '1 1 0',
      minWidth: '0',
    },
  },

  filtersTabs: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },

  sortContainer: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
  },

  sortField: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.margin('0'),
  },

  sortDropdown: {
    width: '180px', // Reduced width
    marginLeft: '8px',
  },
});
