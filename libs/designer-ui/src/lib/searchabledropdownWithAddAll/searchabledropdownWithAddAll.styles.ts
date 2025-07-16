import { makeStyles } from '@fluentui/react-components';

export const useSearchableDropdownWithAddAllStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  dropdownWithButtons: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    alignItems: 'flex-start',
  },

  buttonGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexShrink: 0, // Prevent buttons from shrinking
  },

  searchableDropdownWithButtons: {
    width: '100%',
    marginTop: '0px',
    flex: 1, // Allow dropdown to take remaining space
  },

  searchableDropdownLabel: {
    paddingBottom: '2px',
  },
});
