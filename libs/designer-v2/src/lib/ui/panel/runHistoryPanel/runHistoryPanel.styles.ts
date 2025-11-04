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

  runEntrySmall: {
    height: '32px',
    padding: '0px 2px 0px 8px',
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

  runEntryContentSmall: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
    border: '0px solid transparent',
    borderRadius: tokens.borderRadiusNone,
    backgroundColor: 'transparent',
    width: '4px',
    padding: '0px',
    height: '100%',
    top: 0,
    right: 0,
    bottom: 0,
    cursor: 'col-resize',
    minWidth: 'unset',
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
  resizerActive: {
    borderRightWidth: '4px',
    borderRightColor: tokens.colorNeutralBackground5Pressed,
  },
});
