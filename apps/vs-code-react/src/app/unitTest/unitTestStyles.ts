import { makeStyles, tokens } from '@fluentui/react-components';

export const useUnitTestStyles = makeStyles({
  unitTestResults: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100vh',
  },
  unitTestResultsHeader: {
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalXXL}`,
  },
  unitTestResultsAssertionsList: {
    padding: `0 ${tokens.spacingHorizontalXXL}`,
    flex: '6',
    overflow: 'scroll',
  },
  unitTestResultsAssertionsListItem: {
    display: 'flex',
    margin: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalS}`,
  },
  unitTestResultsButton: {
    flex: '1',
    padding: `0 ${tokens.spacingHorizontalXXL}`,
  },
});
