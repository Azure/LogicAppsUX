import { makeStyles, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  surface: {
    display: 'flex',
    width: '390px',
    minHeight: '410px',
    flexDirection: 'column',
    paddingLeft: '24px',
    paddingRight: '24px',
  },
  detailsButton: {
    paddingLeft: '10px',
  },
  deleteIcon: {
    color: tokens.colorPaletteBlueBorderActive,
  },
  deleteButton: {
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
    color: '#605E5C',
  },
});
