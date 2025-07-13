import { makeStyles, tokens } from '@fluentui/react-components';

export const useMcpDetailsStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  labelSection: {
    minWidth: '120px',
    flex: 1,
  },
  fieldSection: {
    flex: 5,
  },
});
