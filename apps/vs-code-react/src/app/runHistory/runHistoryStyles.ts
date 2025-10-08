import { makeStyles, tokens } from '@fluentui/react-components';

export const useRunHistoryStyles = makeStyles({
  runHistoryContainer: {
    height: '100vh',
    padding: `0 ${tokens.spacingHorizontalXL}`,
  },
  workflowDropdown: {
    display: 'grid',
    gridTemplateRows: 'repeat(1fr)',
    justifyItems: 'start',
    gap: '2px',
    maxWidth: '400px',
  },
});
