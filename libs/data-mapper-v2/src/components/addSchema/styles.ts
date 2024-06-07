import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  drawerWrapper: {
    display: 'flex',
  },
  drawerRoot: {
    backgroundColor: '#fff',
    maxWidth: '480px',
    minWidth: '319px',
    height: '100%',
  },
  defaultDrawerwrapper: {
    width: '100%',
  },
  headerWrapper: {
    display: 'flex',
    width: '100%',
    marginTop: '20px',
    marginBottom: '10px',
  },
  rightCustomHeader: {
    alignSelf: 'center',
    marginLeft: 'auto',
    marginRight: '10px',
  },
  header: {
    paddingLeft: '20px',
    fontWeight: 'initial',
    fontSize: '20px',
  },
  bodyWrapper: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
  },
  selectSchemaWrapper: {
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
  },
  root: {
    display: 'flex',
    height: '100%',
  },
  fileSelectedDrawer: {
    backgroundColor: '#F6FAFE',
  },
  leftDrawer: {
    ...shorthands.borderRight('1px', 'solid', '#ddd'),
  },
  rightDrawer: {
    ...shorthands.borderLeft('1px', 'solid', '#ddd'),
  },
});
