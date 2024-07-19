import { makeStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    width: '400px',
  },
  selection: {
    backgroundColor: '#fff',
  },
  closeButton: {
    paddingBottom: '0px',
    paddingTop: '0px',
  },
  bodyWrapper: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
    height: '100%',
  },
});
