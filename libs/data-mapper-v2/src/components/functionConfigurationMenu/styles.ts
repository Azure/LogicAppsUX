import { makeStyles, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  surface: {
    display: 'flex',
    width: '390px',
    paddingBottom: '10px',
    height: 'contents',
    flexDirection: 'column',
    paddingLeft: '24px',
    paddingRight: '24px',
    overflow: 'scroll',
  },
  fileDropdownStyle: {
    overflow: 'visible',
  },
  detailsButton: {
    paddingLeft: '10px',
  },
  actionIcon: {
    color: tokens.colorPaletteBlueBorderActive,
  },
  topRightActions: {
    marginLeft: 'auto',
  },
  headerRow: {
    display: 'flex',
    flexDirection: 'row',
  },
  addButton: {
    marginLEft: '0px',
  },
  addIcon: {
    fontSize: '12px',
  },
  tabWrapper: {
    paddingTop: '8px',
  },
  detailsText: {
    color: tokens.colorNeutralForeground2,
  },
});
