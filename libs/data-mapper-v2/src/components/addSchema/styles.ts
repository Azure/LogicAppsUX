import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  wrapper: {
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
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  root: {
    display: 'flex',
    height: '100vh',
  },
  drawer: {
    backgroundColor: '#fff',
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
  searchBox: {
    width: '85%',
    alignSelf: 'center',
  },
  searchBoxWrapper: {
    display: 'flex',
    width: '100%',
    justifyContent: 'center',
  },
});
