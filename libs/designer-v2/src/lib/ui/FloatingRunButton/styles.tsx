import { makeStyles } from '@fluentui/react-components';

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
