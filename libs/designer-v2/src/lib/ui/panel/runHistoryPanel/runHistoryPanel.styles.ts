import { makeStyles, tokens } from '@fluentui/react-components';

export const useRunHistoryPanelStyles = makeStyles({
  noRunsText: {
    margin: '16px auto',
    opacity: '0.5',
    display: 'block !important',
  },

  runActionsPopover: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
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
});
