import { makeStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    minHeight: '32px',
    width: 'calc(100% - 35px)', // Match textfield width
    marginRight: '36px', // Match textfield margin
  },
});
