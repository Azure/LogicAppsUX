import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useActionButtonV2Styles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    borderRadius: '50%',
    height: '24px',
    width: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('0px'),
    boxShadow: tokens.shadow2,

    '&::after': {
      outline: 'transparent !important',
    },

    '&:active, &:focus': {
      ...shorthands.border('2px', 'solid', tokens.colorBrandStroke1),
    },

    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      boxShadow: tokens.shadow4,
      cursor: 'pointer',

      '& path': {
        fill: tokens.colorBrandForeground2Hover,
      },
    },

    '&:active': {
      boxShadow: `0 0 3.6px ${tokens.colorBrandStroke1}, 0 0 14.4px ${tokens.colorBrandStroke1}`,
    },

    '&:focus': {
      boxShadow: tokens.shadow4,
    },
  },
});
