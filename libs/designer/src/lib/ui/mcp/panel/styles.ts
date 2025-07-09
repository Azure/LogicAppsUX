import { makeStyles, tokens } from '@fluentui/react-components';

export const useMcpPanelStyles = makeStyles({
  panelContent: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: tokens.colorNeutralBackground1,
    position: 'relative',
    marginLeft: '4px', // Make room for the resize handle
  },

  resizeHandle: {
    position: 'absolute',
    left: '-6px',
    top: '0',
    bottom: '0',
    width: '4px',
    cursor: 'col-resize',
    zIndex: 1000,
    backgroundColor: tokens.colorNeutralStroke2,
    transition: 'background-color 0.2s ease',

    ':hover': {
      backgroundColor: tokens.colorBrandBackground,
    },
    ':active': {
      backgroundColor: tokens.colorBrandBackgroundPressed,
    },
  },
});
