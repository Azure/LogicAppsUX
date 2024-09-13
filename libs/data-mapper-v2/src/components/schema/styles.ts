import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    width: '307px',
    height: '100vh',
  },
  targetScehmaRoot: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
});

export const usePanelStyles = makeStyles({
  root: {
    width: '300px',
    height: '100%',
    ...shorthands.overflow('visible'),
  },
  schemaSelection: {
    backgroundColor: '#fff',
  },
  schemaTree: {
    backgroundColor: '#F6FAFE',
  },
  header: {
    paddingLeft: '20px',
    fontWeight: 'initial',
    fontSize: '20px',
  },
  body: {
    paddingRight: '0px',
    paddingLeft: '0px',
    width: '307px',
  },
  targetSchemaBody: {
    position: 'relative',
    left: '-7px',
  },
});

export const usePanelBodyStyles = makeStyles({
  root: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
    height: '100%',
  },
  treeContainer: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
    height: '100%',
  },
});
