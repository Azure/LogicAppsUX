import { makeStyles, tokens } from '@fluentui/react-components';

export const useMcpDetailsStyles = makeStyles({
  container: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
  labelSection: {
    minWidth: '100px',
    flex: 1,
  },
  fieldSection: {
    flex: 5,
  },
  comboboxContainer: {
    width: '100%',
    marginLeft: 'auto',
  },
  combobox: {
    width: '100%',
  },
  linkSection: {
    paddingTop: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalXXS,
  },
});
