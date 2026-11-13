import { makeStyles } from '@fluentui/react-components';

export const useConnectionViewStyles = makeStyles({
  connectionViewContainer: {
    height: '100vh',
  },
  notConfigured: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '560px',
    padding: '24px',
  },
  notConfiguredActions: {
    display: 'flex',
    gap: '8px',
  },
});
