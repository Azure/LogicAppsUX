import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  functionsIcon: {
    height: '20px',
    width: '20px',
  },
  chevronButton: {
    paddingLeft: '0px',
    paddingRight: '0px',
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
    marginTop: '15px',
    marginBottom: '5px',
  },
  collapsedDrawerBodyWrapper: {
    display: 'flex',
    width: '100%',
  },
  expandedDrawerBodyWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    marginLeft: '10px',
  },
  drawerHeader: {
    fontWeight: 'initial',
    fontSize: '20px',
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
    flexDirection: 'column',
    width: '100%',
  },
});
