import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * Modal dialog styles migrated from modaldialog/modaldialog.less
 * Responsive dialog styles with proper width handling and dark theme support
 */
export const useModalDialogStyles = makeStyles({
  modalDialog: {
    // Target Fluent UI Dialog main container
    "& div[class^='ms-Dialog-main']": {
      width: '80vw',

      '@media (min-width: 480px)': {
        maxWidth: 'none',
      },

      '@media only screen and (max-width: 800px)': {
        width: '100%',
      },
    },
  },
  modalContent: {
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'auto',
    width: '100%',
  },
  modalBody: {
    textAlign: 'center',
  },
});

/**
 * Dark theme specific styles (for when msla-theme-dark class is present)
 */
export const useModalDialogDarkStyles = makeStyles({
  modalContent: {
    backgroundColor: tokens.colorNeutralBackground1, // Fluent UI handles dark theme automatically
  },
});
