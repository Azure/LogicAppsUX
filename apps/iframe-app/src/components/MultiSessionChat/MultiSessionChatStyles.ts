import { makeStyles, tokens, shorthands } from '@fluentui/react-components';

export const useMultiSessionChatStyles = makeStyles({
  multiSessionContainer: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebar: {
    height: '100vh',
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  sidebarTransition: {
    transition: 'width 0.3s ease',
  },
  sidebarCollapsed: {
    width: '0px !important',
    ...shorthands.borderRight('none'),
    overflow: 'hidden',
  },
  resizeHandle: {
    position: 'absolute',
    right: '-3px',
    top: 0,
    bottom: 0,
    width: '6px',
    cursor: 'col-resize',
    backgroundColor: 'transparent',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: tokens.colorBrandBackground,
    },
  },
  resizing: {
    userSelect: 'none',
    cursor: 'col-resize',
  },
  chatArea: {
    flex: 1,
    height: '100vh',
    minWidth: 0,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sessionChat: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  sessionChatHidden: {
    visibility: 'hidden',
    pointerEvents: 'none',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: tokens.colorPaletteRedForeground1,
  },
});
