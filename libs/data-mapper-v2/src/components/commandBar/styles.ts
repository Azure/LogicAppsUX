import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  toolbar: {
    backgroundColor: '#F6FAFE',
    justifyContent: 'space-between',
    ...shorthands.borderBottom('1px', 'solid', '#ddd'),
  },
  button: {
    ...shorthands.padding('5px', '0px'),
    minWidth: '80px',
  },
  toggleButton: {
    ...shorthands.border('0'),
    ...shorthands.borderStyle('none'),
    backgroundColor: 'transparent',
  },
  toggleButtonSelected: {
    ...shorthands.border('0'),
    ...shorthands.borderStyle('none'),
  },
  divider: {
    maxHeight: '25px',
    marginTop: '4px',
  },
  toolbarGroup: {
    display: 'flex',
  },
});
