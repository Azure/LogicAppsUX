import { makeStyles } from '@fluentui/react-components';

export const useFloatingRunButtonStyles = makeStyles({
  container: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translate(-50%, 0)',
  },
  errorBadge: {
    position: 'absolute',
    top: '-4px',
    left: '-4px',
  },
  errorTooltip: {
    padding: '0px',
    wordBreak: 'break-word',
  },
});

export const usePayloadPopoverStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '360px',
  },

  monacoEditor: {
    '& .lines-content, & .margin': {
      overflow: 'initial !important',
      contain: 'none !important',
    },
  },

  runButton: {
    marginTop: '8px',
  },
});
