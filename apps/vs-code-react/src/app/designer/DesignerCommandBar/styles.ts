import { makeStyles, tokens } from '@fluentui/react-components';

export const useCommandBarStyles = makeStyles({
  viewModeContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: '4px',
    padding: '4px',
    borderRadius: '6px',
    position: 'absolute',
    bottom: '-16px',
    left: '50%',
    transform: 'translate(-50%, 0)',
    zIndex: 1,
  },
  viewButton: {
    padding: '3px 12px',
  },
  selectedButton: {
    background: `${tokens.colorNeutralForeground1} !important`,
    color: tokens.colorNeutralForegroundInverted,
    '&:hover': {
      color: tokens.colorNeutralForegroundInverted,
    },
  },
});
