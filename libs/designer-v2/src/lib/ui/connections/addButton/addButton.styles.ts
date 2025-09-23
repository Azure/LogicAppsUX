import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useAddButtonStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: '0px',
    borderRadius: '50%',
    height: '20px',
    width: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('0px'),
    boxShadow: '0 0 2px rgba(0,0,0,0.24), 0 2px 4px rgba(0,0,0,0.28)',

    '&::after': {
      outline: 'transparent !important',
    },

    '&:active, &:focus': {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },

    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      cursor: 'pointer',
    },
  },
  rootDark: {
    backgroundColor: 'var(--colorEdge)',
    '&:active, &:focus': {
      backgroundColor: tokens.colorNeutralForeground3Pressed,
    },
    '&:hover': {
      backgroundColor: tokens.colorNeutralForeground3Hover,
      cursor: 'pointer',
    },
  },
});
