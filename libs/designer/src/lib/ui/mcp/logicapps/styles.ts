import { makeStyles, tokens } from '@fluentui/react-components';

export const useCreateDetailsStyles = makeStyles({
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
    width: '300px',
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

export const useCreateReviewStyles = makeStyles({
  container: {
    paddingLeft: tokens.spacingHorizontalM,
  },
  templatesSection: {
    paddingTop: '20px',
  },
  resourcesSection: {
    paddingTop: tokens.spacingVerticalXL,
    width: '80%',
  },
  resourceIcon: {
    marginTop: '-5px',
  },
  resourceName: {
    padding: '0 0 4px 10px',
  },
  operationProgress: {
    width: '20px',
    height: '20px',
    paddingRight: '6px',
  },
});
