import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { customTokens } from '../../core/ThemeConect';

export const useStyles = makeStyles({
  toolbar: {
    backgroundColor: customTokens['panelBackground'],
    justifyContent: 'space-between',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
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
