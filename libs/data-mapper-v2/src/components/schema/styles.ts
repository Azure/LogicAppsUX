import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    width: '300px',
    height: '100%',
  },
  rootWithSchemaSelection: {
    backgroundColor: '#fff',
  },
  rootWithSchemaTree: {
    backgroundColor: '#F6FAFE',
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
    height: '100%',
  },
  selectSchemaWrapper: {
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
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
  treeWrapper: {
    display: 'flex',
    width: '100%',
    justifyContent: 'center',
    flexDirection: 'column',
    height: '100%',
  },
});
