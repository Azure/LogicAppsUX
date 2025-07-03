import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  closeButton: {
    minWidth: 'auto',
    flexShrink: 0,
  },
});

export const panelStyles = {
  main: {
    ...shorthands.padding('0', '20px'),
    zIndex: 1000,
  },
  content: {
    paddingLeft: '0px',
  },
};
