import { makeStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  contextMenu: {
    backgroundColor: 'transparent',
    position: 'absolute',
    zIndex: -1,
    width: '2px',
    height: '2px',
  },
  root: {
    paddingTop: '0px',
    paddingLeft: '0px',
    paddingRight: '0px',
    paddingBottom: '0px',
  },
});
