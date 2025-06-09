import { makeStyles } from '@fluentui/react-components';

export const useOverviewStyles = makeStyles({
  runHistoryFilter: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    marginTop: '1em',
    '& > button': {
      alignSelf: 'baseline',
    },
  },
  overviewLoadMore: {
    display: 'block',
    marginLeft: 'auto',
  },
  workflowProperties: {
    '& > label': {
      display: 'flex',
      flexDirection: 'row',
      '& > *:first-child': {
        flexBasis: '150px',
      },
      '& > *:last-child': {
        flex: '1',
      },
    },
  },
});
