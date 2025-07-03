import { makeStyles } from '@fluentui/react-components';
import type { IPanelStyles } from '@fluentui/react';

export const useStyles = makeStyles({
  closeButton: {
    minWidth: 'auto',
    flexShrink: 0,
  },
});

export const getPanelStyles = (): Partial<IPanelStyles> => ({
  main: {
    padding: '0 20px',
    zIndex: 1000,
  },
  content: {
    paddingLeft: '0px',
  },
});
