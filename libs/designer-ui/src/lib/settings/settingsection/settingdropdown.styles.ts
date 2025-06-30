import { makeStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '50%', // Match the LESS style for dropdowns
  },
  dropdown: {
    width: '100%',
    minWidth: '250px',
  },
});
