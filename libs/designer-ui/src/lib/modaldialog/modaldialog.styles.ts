import { makeStyles, tokens } from '@fluentui/react-components';

export const useModalDialogStyles = makeStyles({
  modalDialog: {
    '& div[class^="ms-Dialog-main"]': {
      width: '80vw',
      maxWidth: 'none',

      '@media (min-width: 480px)': {
        maxWidth: 'none',
      },

      '@media only screen and (max-width: 800px)': {
        width: '100%',
      },
    },
  },

  modalContent: {
    backgroundColor: tokens.colorNeutralBackground1, // Automatically handles theme switching
    overflow: 'auto',
    width: '100%',
  },

  modalBody: {
    textAlign: 'center',
  },
});
