import { makeStyles } from '@fluentui/react-components';

export const useHandoffTabStyles = makeStyles({
  handoffEntryContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  handoffToolEntry: {
    display: 'flex',
    flexDirection: 'column',
  },
  handoffToolEntryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  handoffToolEntryBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '8px 40px 24px',
  },
  handoffInput: {
    display: 'flex',
    flexDirection: 'column',
  },
});
