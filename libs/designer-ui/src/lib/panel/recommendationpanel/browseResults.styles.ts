import { makeStyles, tokens } from '@fluentui/react-components';

export const useBrowseResultStyles = makeStyles({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
  },
  gridContainer: {
    display: 'grid',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalS,
    gridTemplateColumns: '1fr', // Default to single column
    alignItems: 'stretch', // Stretch items to fill height
    '& > *': {
      minWidth: 0, // Allow grid items to shrink
    },
  },
  doubleColumn: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  itemWrapper: {
    display: 'flex',
    width: '100%',
    minWidth: 0, // Allow shrinking
    '& .msla-connector-summary-card': {
      width: '100%',
      flex: '1',
    },
  },
  noResults: {
    textAlign: 'center',
    marginTop: tokens.spacingVerticalXXL,
  },
  loadingContainer: {
    marginBottom: tokens.spacingVerticalM,
  },
  loadingMoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalM,
    gridColumn: '1 / -1', // Span full width in grid
  },
});
