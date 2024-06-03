import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  functionsIcon: {
    height: '20px',
    width: '20px',
  },
  chevronButton: {
    paddingLeft: '0px',
    paddingRight: '0px',
    minWidth: '10px',
  },
  functionsChevronIcon: {
    alignSelf: 'right',
    alignItems: 'right',
  },
  expandedDataMapperFunctionPanel: {
    backgroundColor: '#E8F3FE',
    ...shorthands.borderRight('1px', 'solid', '#ddd'),
    width: '240px',
  },
  collapsedDataMapperFunctionPanel: {
    backgroundColor: '#E8F3FE',
    maxWidth: '40px',
    minWidth: '40px',
    width: '40px',
    ...shorthands.borderRight('1px', 'solid', '#ddd'),
    display: 'flex',
    cursor: 'pointer',
  },
  drawerHeaderWrapper: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    marginTop: '15px',
    marginBottom: '0px',
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
    fontWeight: 'fontw',
    fontSize: '16px',
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
