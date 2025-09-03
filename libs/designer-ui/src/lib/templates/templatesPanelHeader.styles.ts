import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  header: {
    ...shorthands.padding('16px', '20px', '16px', '0'),
    width: '100%',
  },
  titleSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    ...shorthands.gap('16px'),
  },
  titleWrapper: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    ...shorthands.flex(1),
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    ...shorthands.gap('16px'),
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    lineHeight: '32px',
    ...shorthands.flex(1),
  },
  rightActionWrapper: {
    flexShrink: 0,
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 500,
    ...shorthands.gap('4px'),
  },
});
