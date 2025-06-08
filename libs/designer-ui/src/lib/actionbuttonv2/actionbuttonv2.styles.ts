import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useActionButtonV2Styles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground1, // Automatically handles theme switching
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1), // Theme-aware border
    borderRadius: '50%',
    height: '24px',
    width: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('0px'),

    '&::after': {
      outline: 'transparent !important',
    },

    '&:active, &:focus': {
      ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    },

    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover, // Theme-aware hover
      boxShadow: '0 0.6px 1.8px rgba(0, 0, 0, 0.1), 0 3.2px 7.2px rgba(0, 0, 0, 0.13)',
      cursor: 'pointer',
    },

    '&:active': {
      boxShadow: `0 0 3.6px ${tokens.colorBrandStroke1}, 0 0 14.4px ${tokens.colorBrandStroke1}`,
    },

    '&:focus': {
      boxShadow: '0 0.6px 1.8px rgba(0, 0, 0, 0.1), 0 3.2px 7.2px rgba(0, 0, 0, 0.13)',
    },

    // Dark theme specific styles that can't be handled by tokens alone
    '.msla-theme-dark &': {
      boxShadow: '0 0.3px 0.9px rgba(255, 255, 255, 0.1), 0 1.6px 3.6px rgba(255, 255, 255, 0.13)',

      '&:active, &:focus': {
        ...shorthands.border('2px', 'solid', '#3aa0f3'),
      },

      '&:hover': {
        boxShadow: '0 0.6px 1.8px rgba(255, 255, 255, 0.1), 0 3.2px 7.2px rgba(255, 255, 255, 0.13)',

        '& path': {
          fill: '#82c7ff',
        },
      },

      '&:active': {
        boxShadow: '0 0 3.6px #3aa0f3, 0 0 14.4px #3aa0f3',
      },

      '&:focus': {
        boxShadow: '0 0.6px 1.8px rgba(255, 255, 255, 0.1), 0 3.2px 7.2px rgba(255, 255, 255, 0.13)',
      },
    },
  },
});
