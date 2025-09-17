import { makeStyles, tokens } from '@fluentui/react-components';

export const useCreateDetailsStyles = makeStyles({
  description: {
    paddingBottom: tokens.spacingVerticalL,
  },
  container: {
    paddingLeft: tokens.spacingHorizontalM,
  },
  labelSection: {
    minWidth: '120px',
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
    width: 'fit-content',
    paddingTop: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalXXS,
  },
});

export const useCreatePopupStyles = makeStyles({
  inputSection: {
    padding: '10px 0',
  },
  buttonSection: {
    display: 'flex',
    paddingTop: tokens.spacingVerticalS,
    gap: tokens.spacingHorizontalS,
  },
  linkSection: {
    width: 'fit-content',
    paddingTop: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalXXS,
  },
});
