import { makeStyles, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  surface: {
    display: 'flex',
    width: '360px',
    height: '410px',
    flexDirection: 'column',
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
  }
});
