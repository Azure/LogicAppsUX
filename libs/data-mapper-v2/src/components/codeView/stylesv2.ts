import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  functionsIcon: {
    height: '20px',
    width: '20px',
  },
  chevronButtonExpanded: {
    paddingLeft: '0px',
    paddingRight: '0px',
    minWidth: '10px',
    marginLeft: 'auto',
  },
  functionsChevronIcon: {
    alignSelf: 'right',
    alignItems: 'right',
  },
  codePanel: {
    backgroundColor: '#E8F3FE',
    ...shorthands.borderLeft('1px', 'solid', '#ddd'),
    width: '350px',
  },
  drawerHeaderWrapper: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    marginTop: '8px',
    marginBottom: '5px',
    alignItems: 'center',
  },
  collapsedDrawerBodyWrapper: {
    paddingTop: '8px',
    display: 'flex',
    width: '100%',
  },
  expandedDrawerBodyWrapper: {
    display: 'flex',
    flexDirection: 'column',
    marginRight: '10px',
    width: '220px',
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
