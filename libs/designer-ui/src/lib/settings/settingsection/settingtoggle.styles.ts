import { makeStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '32px',
  },
  switch: {
    // The Switch component in v9 doesn't need the explicit class name
    // as it handles its own internal styling
  },
});
