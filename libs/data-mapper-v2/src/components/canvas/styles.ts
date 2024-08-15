import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import type { CSSProperties } from 'react';

export const useStyles = makeStyles({
  contextMenu: {
    backgroundColor: 'transparent',
    position: 'absolute',
    zIndex: -1,
    width: '2px',
    height: '2px',
  },
  wrapper: {
    height: '100%',
    display: 'flex',
    wdith: '100%',
    ...shorthands.flex(1, 1, '1px'),
    backgroundColor: tokens.colorNeutralBackground1,
  },
});

export const reactFlowStyle: CSSProperties = {
  height: '100%',
  width: '100%',
  backgroundColor: tokens.colorNeutralBackground1,
  overflow: 'visible',
};
