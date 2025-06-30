import { makeStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  dropdown: {
    width: 'calc(100% - 35px)', // Match textfield width
    marginRight: '36px', // Match textfield margin
    minWidth: '250px',
  },
});
