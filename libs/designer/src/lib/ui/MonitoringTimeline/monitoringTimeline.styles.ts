import { makeStyles, tokens } from '@fluentui/react-components';

export const useMonitoringTimelineStyles = makeStyles({
  monitoringTimelineRoot: {
    margin: '20px',
    borderRadius: '28px',
    gap: '8px',

    // Styling for the slider
    '--colorCompoundBrandBackground': '#1f85ff',
    '--colorCompoundBrandBackgroundHover': '#186acc',
    '--colorCompoundBrandBackgroundPressed': '#186acc',
    '--colorNeutralStrokeAccessible': tokens.colorNeutralStroke1Pressed,
  },

  timelineMainContent: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    maxHeight: '390px',
  },

  timelineIcon: {
    color: tokens.colorBrandForeground1,
    width: '30px',
    height: '30px',
  },

  timelineNodeContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    margin: '-8px',
    padding: '16px 8px',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    flexGrow: 1,
  },

  timelineNode: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '8px',
    borderRadius: tokens.borderRadiusXLarge,
    cursor: 'pointer',
    margin: '-4px',
    padding: '4px',

    '&:hover': {
      backgroundColor: '#1f85ff20',
    },
  },

  timelineTask: {
    padding: '0px 5px',
    margin: '5px 0px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: '#1f85ff20',
  },

  selectionBox: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: 'calc(100% - 6px)',
    height: 'calc(100% - 4px)',
    border: '2px solid #1f85ff',
    borderRadius: '8px',
  },

  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  flexCol: {
    display: 'flex',
    flexDirection: 'column',
  },

  navButton: {
    padding: '6px',
    justifyContent: 'flex-start',
  },

  errorCaretContainer: {
    position: 'absolute',
    top: '0px',
    right: '-10px',
    bottom: '0px',
    display: 'flex',
    flexDirection: 'column',
    margin: '2px 0px',
    justifyContent: 'space-between',
  },

  errorCaret: {
    width: '16px',
    height: '16px',
    color: tokens.colorStatusDangerForeground1,
  },

  errorIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
  },
});
