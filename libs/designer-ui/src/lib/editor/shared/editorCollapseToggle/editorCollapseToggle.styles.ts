import { makeStyles, shorthands } from '@fluentui/react-components';

export const useEditorCollapseToggleStyles = makeStyles({
  toggleButton: {
    verticalAlign: 'top',
    display: 'inline-block',
    ...shorthands.padding('0'),

    '& img': {
      width: '16px',
      height: '16px',
      verticalAlign: 'middle',
    },

    '&[disabled]': {
      cursor: 'default',
      '& img': {
        opacity: '0.6',
      },
    },

    '@media (forced-colors: active)': {
      filter: 'invert(1)',
    },

    '&:hover': {
      '@media (forced-colors: active)': {
        forcedColorAdjust: 'none',
      },
    },
  },
});
