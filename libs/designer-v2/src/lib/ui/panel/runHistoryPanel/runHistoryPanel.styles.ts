import { makeStyles, tokens } from '@fluentui/react-components';

export const useRunHistoryPanelStyles = makeStyles({
  noRunsText: {
    margin: '16px auto',
    opacity: '0.5',
    display: 'block !important',
  },

  flexbox: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '8px',
  },

  runProperty: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  runEntry: {
    position: 'relative',
    cursor: 'pointer',
    padding: '8px 12px 10px 16px',
    borderRadius: '2px',
    display: 'flex',
    flexDirection: 'row',

    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':active': {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },
  },

  runEntryContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  runEntrySubtext: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  runEntrySelectedIndicator: {
    width: '4px',
    position: 'absolute',
    top: '0px',
    left: '0px',
    bottom: '0px',
    backgroundColor: tokens.colorNeutralForeground3BrandSelected,
    borderRadius: '4px',
  },

  runEntrySelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },

  // Resizer styles

  resizer: {
    zIndex: 3,
    position: 'absolute',
    border: 'none',
    borderRadius: tokens.borderRadiusNone,
    backgroundColor: 'transparent',
    width: '24px',
    height: '100%',
    top: 0,
    right: 0,
    bottom: 0,
    cursor: 'col-resize',
    minWidth: 'unset',
    transform: 'translateX(50%)',

    '&:before': {
      content: '""',
      position: 'absolute',
      borderLeft: `1px solid ${tokens.colorNeutralBackground5}`,
      width: '1px',
      height: '100%',
      transform: 'translateX(50%)',
      right: '50%',
    },
    ':hover': {
      borderLeftWidth: '4px',
      cursor: 'col-resize',
      backgroundColor: 'transparent',
    },
    ':hover:active': {
      backgroundColor: 'transparent',
      cursor: 'col-resize',
    },
  },
  resizerActive: {
    borderLeftWidth: '4px',
    borderLeftColor: tokens.colorNeutralBackground5Pressed,
  },
});
