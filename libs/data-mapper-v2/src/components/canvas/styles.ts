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
    width: '-webkit-fill-available',
    ...shorthands.flex(1, 1, '1px'),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  background: {
    display: 'flex',
    justifyContent: 'center',
    height: '100vh',
  },
  placeholderContainer: {
    height: '430px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    paddingTop: '170px',
    width: '250px',
    height: '198px',
    textAlign: 'center',
    color: '#CAC8C8',
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: '24px',
    wordWrap: 'break-word',
  },
  placeholderImage: {
    width: '150px',
    height: '300px',
  },
});

export const reactFlowStyle: CSSProperties = {
  height: '100%',
  width: '100%',
  backgroundColor: tokens.colorNeutralBackground1,
};
