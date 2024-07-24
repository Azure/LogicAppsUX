import { makeStyles, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  surface: {
    display: 'flex',
    width: '360px',
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
    width: '210px',
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
    width: '190px',
    textAlign: 'end',
  },
  tabWrapper: {
    paddingTop: '8px',
  },
});
