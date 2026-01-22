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
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '16px',
    width: '100%',
    '& > *': {
      flex: '1 1 auto',
      minWidth: '150px',
    },
  },

  filtersTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },

  sortContainer: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
    flexShrink: 0,
  },

  sortField: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    ...shorthands.margin('0'),
  },

  sortDropdown: {
    minWidth: '120px',
    maxWidth: '180px',
    width: 'auto',
  },
});
