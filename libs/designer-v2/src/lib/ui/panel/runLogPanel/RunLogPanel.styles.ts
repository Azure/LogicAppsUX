import { makeStyles, tokens } from '@fluentui/react-components';

export const useRunLogPanelStyles = makeStyles({
  drawer: {
    maxHeight: '100%',
    height: '100%',
  },
  drawerBody: {
    padding: '0px !important',
    display: 'flex',
    flexDirection: 'column',
  },
  treeViewContainer: {
    padding: '16px 16px',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  nodeDetailsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingTop: '16px',
    overflow: 'hidden',
  },
  nodeDetailsHeading: {
    padding: '0px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',

    '& .fui-TabList': {
      margin: '-4px -12px 0px',
    },
  },
  nodeDetailsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexDirection: 'row',
    marginRight: '-8px',
  },
  nodeDetailsContent: {
    padding: '0px 24px',
    flexGrow: 1,
    overflowY: 'auto',
  },
  actionIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '2px',
    objectFit: 'cover',
  },
  actionName: {
    fontWeight: 600,
    fontSize: '16px',
    flexGrow: 1,
  },
  //
  resizer: {
    zIndex: 3,
    position: 'absolute',
    border: 'none',
    borderRadius: tokens.borderRadiusNone,
    backgroundColor: 'transparent',
  },
  resizerVertical: {
    width: '24px',
    height: '100%',
    top: 0,
    left: 0,
    bottom: 0,
    cursor: 'col-resize',
    minWidth: 'unset',
    transform: 'translateX(-50%)',

    '&:before': {
      content: '""',
      position: 'absolute',
      borderRight: `1px solid ${tokens.colorNeutralBackground5}`,
      width: '1px',
      height: '100%',
      transform: 'translateX(-50%)',
      left: '50%',
    },
    ':hover': {
      borderRightWidth: '4px',
      cursor: 'col-resize',
      backgroundColor: 'transparent',
    },
    ':hover:active': {
      backgroundColor: 'transparent',
      cursor: 'col-resize',
    },
  },
  resizerHorizontal: {
    zIndex: 3,
    height: '24px',
    width: '100%',
    left: 0,
    top: 0,
    right: 0,
    cursor: 'row-resize',
    minHeight: 'unset',
    transform: 'translateY(-50%)',

    '&:before': {
      content: '""',
      position: 'absolute',
      borderTop: `1px solid ${tokens.colorNeutralBackground5}`,
      height: '1px',
      width: '100%',
      transform: 'translateY(-50%)',
      top: '50%',
    },
    ':hover': {
      borderTopWidth: '4px',
      cursor: 'row-resize',
      backgroundColor: 'transparent',
    },
    ':hover:active': {
      backgroundColor: 'transparent',
      cursor: 'row-resize',
    },
  },
  resizerActive: {
    borderRightWidth: '4px',
    borderRightColor: tokens.colorNeutralBackground5Pressed,
  },
});
