import { makeStyles } from '@fluentui/react-components';

export const useRunLogActionValuesStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  valueLink: {
    alignSelf: 'flex-end',
  },
  valueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',

    '& .msla-trace-value-display-name': {
      fontWeight: 600,
    },
  },
});
