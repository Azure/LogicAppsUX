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
  unlimitedInputHeaderCell: {
    width: '170px',
    display: 'inline-block',
    paddingRight: '5px',
  },
  listButton: {
    width: '40px',
    maxWidth: '40px',
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
  inputNameDiv: {
    width: '200px',
  },
  inputName: {
    display: 'block',
  },
  boundedInputTopRow: {
    display: 'flex',
    flexDirection: 'row',
    height: '40px',
  },
  boundedInputRow: {
    paddingBottom: '25px',
  },
  allowedTypes: {
    width: '170px',
    textAlign: 'end',
  },
  tabWrapper: {
    paddingTop: '8px',
  },
  badgeWrapper: {
    width: '70px',
    display: 'inline-block',
  },
});
