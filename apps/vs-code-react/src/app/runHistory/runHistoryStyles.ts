import { makeStyles, tokens } from '@fluentui/react-components';

export const useRunHistoryStyles = makeStyles({
  runHistoryContainer: {
    height: '100vh',
    padding: `${tokens.spacingHorizontalXL}`,
  },
  runHistoryTitle: {
    margin: `0 ${tokens.spacingHorizontalMNudge}`,
  },
  workflowDropdown: {
    display: 'grid',
    gridTemplateRows: 'repeat(1fr)',
    justifyItems: 'start',
    gap: '2px',
    maxWidth: '400px',
    margin: '10px',
  },
});
