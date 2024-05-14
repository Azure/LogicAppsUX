import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  functionsIcon: {
    height: '20px',
    width: '20px',
  },
  functionsChevronIcon: {
    alignSelf: 'center',
  },
  expandedDataMapperFunctionPanel: {
    backgroundColor: '#E8F3FE',
    ...shorthands.borderRight('1px', 'solid', '#ddd'),
    width: '240px',
  },
  collapsedDataMapperFunctionPanel: {
    backgroundColor: '#E8F3FE',
    maxWidth: '60px',
    minWidth: '50px',
    ...shorthands.borderRight('1px', 'solid', '#ddd'),
    display: 'flex',
    cursor: 'pointer',
  },
  drawerHeaderWrapper: {
    display: 'flex',
    width: '100%',
    marginTop: '20px',
    marginBottom: '10px',
  },
  collapsedDrawerBodyWrapper: {
    display: 'flex',
    width: '100%',
  },
  expandedDrawerBodyWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  drawerHeader: {
    paddingLeft: '20px',
    fontWeight: 'initial',
    fontSize: '20px',
  },
  functionSearchBox: {
    width: '85%',
  },
  drawerHeaderIcon: {
    alignSelf: 'center',
    marginLeft: 'auto',
    marginRight: '10px',
    cursor: 'pointer',
  },
  functionList: {
    justifyContent: 'center',
    display: 'flex',
    width: '100%',
  },
});
