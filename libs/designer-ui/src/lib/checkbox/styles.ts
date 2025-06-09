import { makeStyles, tokens } from '@fluentui/react-components';

export const useCheckboxStyles = makeStyles({
  root: {
    // Container styles
  },
  label: {
    display: 'block',
    fontFamily: tokens.fontFamilyBase,
    textTransform: 'none',
  },
  menuPopup: {
    right: '170px',
    top: '10px',
  },
});

export const useCheckboxDescriptionCalloutStyles = makeStyles({
  dialog: {
    // Target the dialog element inside the callout
    '& div[role="dialog"]': {
      padding: '1em',
    },
  },
});
