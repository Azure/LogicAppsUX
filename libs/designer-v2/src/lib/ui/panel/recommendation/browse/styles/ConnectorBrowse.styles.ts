import { makeStyles, tokens } from '@fluentui/react-components';

export const useConnectorBrowseStyles = makeStyles({
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px',
  },
  emptyStateContainer: {
    textAlign: 'center',
    padding: '40px',
    color: tokens.colorNeutralForeground2,
  },
  connectorGrid: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
    height: 'calc(100% - 120px)',
  },
});
