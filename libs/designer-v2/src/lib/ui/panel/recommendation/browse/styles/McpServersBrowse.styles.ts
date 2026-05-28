import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useMcpServersBrowseStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  headerSection: {
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingHorizontalL,
    gap: tokens.spacingVerticalM,
  },
  description: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
  },
  searchBox: {
    width: '100%',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    padding: `0 ${tokens.spacingHorizontalL}`,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
  },
  emptyStateContainer: {
    textAlign: 'center',
    padding: '40px',
    color: tokens.colorNeutralForeground2,
  },
  itemCountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
  },
  itemCount: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  sortField: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    '& label': {
      fontSize: tokens.fontSizeBase200,
      color: tokens.colorNeutralForeground2,
      marginRight: tokens.spacingHorizontalXS,
    },
  },
  sortDropdown: {
    minWidth: '130px',
  },
  serverList: {
    flex: 1,
    overflowY: 'auto',
    padding: `0 ${tokens.spacingHorizontalL}`,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
});
